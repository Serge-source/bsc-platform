const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    if (apiKey) {
      return handleApiKey(req, res, next, apiKey);
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        department: true,
        tenant: true,
      },
    });

    if (!user || !user.isActive || !user.tenant.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    req.tenantId = user.tenantId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const handleApiKey = async (req, res, next, rawKey) => {
  const crypto = require('crypto');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { tenant: true },
  });
  if (!apiKey || !apiKey.isActive || (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  req.tenantId = apiKey.tenantId;
  req.apiKeyMode = true;
  next();
};

const requirePermission = (resource, action) => (req, res, next) => {
  if (req.apiKeyMode) return next();
  const permissions = req.user?.roles?.flatMap((ur) =>
    ur.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`)
  ) ?? [];
  if (!permissions.includes(`${resource}:${action}`) && !permissions.includes(`${resource}:*`) && !permissions.includes('*:*')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

const requireRole = (...roleNames) => (req, res, next) => {
  const userRoles = req.user?.roles?.map((ur) => ur.role.name) ?? [];
  if (!roleNames.some((r) => userRoles.includes(r))) {
    return res.status(403).json({ error: 'Insufficient role' });
  }
  next();
};

module.exports = { authenticate, requirePermission, requireRole };
