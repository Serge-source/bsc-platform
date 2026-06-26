const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('tenantName').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password, firstName, lastName, tenantName, tenantSlug } = req.body;

      const slug = (tenantSlug || tenantName)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const existing = await prisma.tenant.findUnique({ where: { slug } });
      if (existing) return res.status(409).json({ error: 'Organization slug already taken' });

      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: tenantName,
            slug,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });

        const org = await tx.organization.create({
          data: { tenantId: tenant.id, name: tenantName },
        });

        // Create default perspectives
        const defaultPerspectives = [
          { name: 'Financial', color: '#16a34a', icon: '💰', order: 0 },
          { name: 'Customer', color: '#3b82f6', icon: '👥', order: 1 },
          { name: 'Internal Processes', color: '#f59e0b', icon: '⚙️', order: 2 },
          { name: 'Learning & Growth', color: '#8b5cf6', icon: '📈', order: 3 },
        ];
        await tx.perspective.createMany({
          data: defaultPerspectives.map((p) => ({ ...p, tenantId: tenant.id, isDefault: true })),
        });

        // Create admin role with all permissions
        const adminRole = await tx.role.create({
          data: { tenantId: tenant.id, name: 'Admin', isSystem: true },
        });

        const resources = ['users','organizations','departments','strategies','scorecards','kpis','initiatives','risks','reports','admin'];
        for (const resource of resources) {
          for (const action of ['create','read','update','delete']) {
            const perm = await tx.permission.upsert({
              where: { resource_action: { resource, action } },
              create: { resource, action },
              update: {},
            });
            await tx.rolePermission.create({ data: { roleId: adminRole.id, permissionId: perm.id } });
          }
        }

        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email,
            password: hashedPassword,
            firstName,
            lastName,
          },
        });

        await tx.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });

        return { tenant, org, user };
      });

      const { accessToken, refreshToken } = generateTokens(result.user.id);

      await prisma.session.create({
        data: {
          userId: result.user.id,
          token: refreshToken,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      res.status(201).json({
        accessToken,
        refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          tenantId: result.tenant.id,
          tenantSlug: result.tenant.slug,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password, totpCode } = req.body;

      const user = await prisma.user.findFirst({
        where: { email },
        include: {
          tenant: true,
          roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      if (user.twoFactorEnabled) {
        if (!totpCode) return res.status(200).json({ requires2FA: true });
        const isValidTotp = authenticator.verify({ token: totpCode, secret: user.twoFactorSecret });
        if (!isValidTotp) return res.status(401).json({ error: 'Invalid 2FA code' });
      }

      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      const { accessToken, refreshToken } = generateTokens(user.id);

      await prisma.session.create({
        data: {
          userId: user.id,
          token: refreshToken,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const permissions = user.roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`)
      );

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          tenantId: user.tenantId,
          tenantSlug: user.tenant.slug,
          tenantName: user.tenant.name,
          roles: user.roles.map((ur) => ur.role.name),
          permissions,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const session = await prisma.session.findUnique({ where: { token: refreshToken } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.session.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { password, twoFactorSecret, ...user } = req.user;
  res.json(user);
});

// POST /api/auth/2fa/setup
router.post('/2fa/setup', authenticate, async (req, res) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(req.user.email, process.env.APP_NAME || 'BSC Platform', secret);
  await prisma.user.update({ where: { id: req.user.id }, data: { twoFactorSecret: secret } });
  res.json({ secret, otpauth });
});

// POST /api/auth/2fa/enable
router.post('/2fa/enable', authenticate, async (req, res) => {
  const { code } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
  if (!valid) return res.status(400).json({ error: 'Invalid code' });
  await prisma.user.update({ where: { id: req.user.id }, data: { twoFactorEnabled: true } });
  res.json({ message: '2FA enabled' });
});

module.exports = router;
