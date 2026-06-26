const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const orgs = await prisma.organization.findMany({
      where: { tenantId: req.tenantId },
      include: { departments: true, _count: { select: { strategies: true, scorecards: true, risks: true } } },
    });
    res.json(orgs);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const org = await prisma.organization.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { departments: { include: { children: true, _count: { select: { users: true } } } }, strategies: { where: { isActive: true } } },
    });
    if (!org) return res.status(404).json({ error: 'Not found' });
    res.json(org);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const org = await prisma.organization.update({ where: { id: req.params.id }, data: req.body });
    res.json(org);
  } catch (err) { next(err); }
});

module.exports = router;
