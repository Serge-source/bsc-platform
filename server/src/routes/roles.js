const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      where: { tenantId: req.tenantId },
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    });
    res.json(roles);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description, permissionIds } = req.body;
    const role = await prisma.role.create({
      data: {
        tenantId: req.tenantId,
        name,
        description,
        permissions: permissionIds ? { create: permissionIds.map((id) => ({ permissionId: id })) } : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });
    res.status(201).json(role);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { permissionIds, ...data } = req.body;
    if (permissionIds) {
      await prisma.rolePermission.deleteMany({ where: { roleId: req.params.id } });
      await prisma.rolePermission.createMany({ data: permissionIds.map((id) => ({ roleId: req.params.id, permissionId: id })) });
    }
    const role = await prisma.role.update({ where: { id: req.params.id }, data });
    res.json(role);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const role = await prisma.role.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!role) return res.status(404).json({ error: 'Not found' });
    if (role.isSystem) return res.status(400).json({ error: 'Cannot delete system role' });
    await prisma.role.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

router.get('/permissions/all', async (req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
    res.json(permissions);
  } catch (err) { next(err); }
});

module.exports = router;
