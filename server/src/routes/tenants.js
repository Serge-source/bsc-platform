const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireRole } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/current', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      include: { _count: { select: { users: true, organizations: true } } },
    });
    res.json(tenant);
  } catch (err) { next(err); }
});

router.put('/current', requireRole('Admin'), async (req, res, next) => {
  try {
    const { name, logo, primaryColor, domain } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: req.tenantId },
      data: { name, logo, primaryColor, domain },
    });
    res.json(tenant);
  } catch (err) { next(err); }
});

module.exports = router;
