const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { requireRole } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const where = { tenantId: req.tenantId };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, email: true, firstName: true, lastName: true, title: true, avatar: true, isActive: true, lastLoginAt: true, twoFactorEnabled: true, department: true, roles: { include: { role: true } }, createdAt: true },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { firstName: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ items: users, total });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      select: { id: true, email: true, firstName: true, lastName: true, title: true, phone: true, avatar: true, isActive: true, department: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) { next(err); }
});

router.post('/', requireRole('Admin'), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, title, departmentId, roleIds } = req.body;
    const hashed = await bcrypt.hash(password || 'Welcome123!', 12);
    const user = await prisma.user.create({
      data: {
        tenantId: req.tenantId,
        email,
        password: hashed,
        firstName,
        lastName,
        title,
        departmentId,
        roles: roleIds ? { create: roleIds.map((id) => ({ roleId: id })) } : undefined,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    res.status(201).json(user);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { password, roleIds, ...data } = req.body;
    if (password) data.password = await bcrypt.hash(password, 12);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, title: true, avatar: true },
    });
    if (Array.isArray(roleIds)) {
      await prisma.userRole.deleteMany({ where: { userId: req.params.id } });
      if (roleIds.length > 0) {
        await prisma.userRole.createMany({ data: roleIds.map((id) => ({ userId: req.params.id, roleId: id })) });
      }
    }
    res.json(user);
  } catch (err) { next(err); }
});

router.patch('/:id/toggle-active', requireRole('Admin'), async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: !user.isActive } });
    res.json({ isActive: updated.isActive });
  } catch (err) { next(err); }
});

module.exports = router;
