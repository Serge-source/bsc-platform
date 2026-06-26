const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireRole } = require('../middleware/auth');
const prisma = new PrismaClient();

router.use(requireRole('Admin'));

router.get('/stats', async (req, res, next) => {
  try {
    const [users, kpis, initiatives, risks, meetings] = await Promise.all([
      prisma.user.count({ where: { tenantId: req.tenantId, isActive: true } }),
      prisma.kPI.count({ where: { tenantId: req.tenantId, status: 'ACTIVE' } }),
      prisma.initiative.count({ where: { tenantId: req.tenantId, status: { in: ['IN_PROGRESS', 'PLANNING'] } } }),
      prisma.risk.count({ where: { tenantId: req.tenantId, status: 'OPEN' } }),
      prisma.meeting.count({ where: { tenantId: req.tenantId, status: 'SCHEDULED' } }),
    ]);
    res.json({ users, kpis, initiatives, risks, meetings });
  } catch (err) { next(err); }
});

router.get('/audit-logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const logs = await prisma.auditLog.findMany({
      where: { tenantId: req.tenantId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    res.json(logs);
  } catch (err) { next(err); }
});

module.exports = router;
