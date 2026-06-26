const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const crudFactory = require('../utils/crudFactory');

const prisma = new PrismaClient();
const crud = crudFactory('kPI', {
  searchFields: ['name', 'description', 'category'],
  include: {
    perspective: true,
    objective: true,
    department: true,
    owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    responsible: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    values: { orderBy: { period: 'desc' }, take: 13 },
    alerts: { where: { isRead: false } },
  },
});

router.get('/', crud.list);
router.get('/:id', crud.get);
router.post('/', crud.create);
router.put('/:id', crud.update);
router.delete('/:id', crud.remove);

// GET /api/kpis/:id/values — full history
router.get('/:id/values', async (req, res, next) => {
  try {
    const values = await prisma.kPIValue.findMany({
      where: { kpiId: req.params.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json(values);
  } catch (err) {
    next(err);
  }
});

// POST /api/kpis/:id/values — enter value for a period
router.post('/:id/values', async (req, res, next) => {
  try {
    const kpi = await prisma.kPI.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!kpi) return res.status(404).json({ error: 'KPI not found' });

    const { actual, period, year, month, quarter, notes, target } = req.body;
    const effectiveTarget = target ?? kpi.target;
    let status = 'NO_DATA';
    if (actual !== null && actual !== undefined && effectiveTarget !== null) {
      const ratio = kpi.higherIsBetter ? actual / effectiveTarget : effectiveTarget / actual;
      if (ratio >= 1) status = 'ON_TARGET';
      else if (kpi.warningLevel && actual >= (kpi.higherIsBetter ? kpi.warningLevel : 0)) status = 'WARNING';
      else status = 'CRITICAL';
      if (kpi.higherIsBetter && actual > effectiveTarget) status = 'EXCEEDED';
    }

    const variance = actual !== null && effectiveTarget ? actual - effectiveTarget : null;
    const variancePct = variance !== null && effectiveTarget ? (variance / effectiveTarget) * 100 : null;

    const value = await prisma.kPIValue.upsert({
      where: { kpiId_period: { kpiId: req.params.id, period } },
      create: { kpiId: req.params.id, actual, period, year, month, quarter, target: effectiveTarget, variance, variancePct, status, notes, enteredById: req.user?.id },
      update: { actual, target: effectiveTarget, variance, variancePct, status, notes, updatedAt: new Date() },
    });

    // Emit real-time update
    req.app.get('io')?.to(`tenant:${req.tenantId}`).emit('kpi-updated', { kpiId: req.params.id, value });

    res.json(value);
  } catch (err) {
    next(err);
  }
});

// GET /api/kpis/dashboard/summary — executive summary stats
router.get('/dashboard/summary', async (req, res, next) => {
  try {
    const kpis = await prisma.kPI.findMany({
      where: { tenantId: req.tenantId, showOnDashboard: true, status: 'ACTIVE' },
      include: {
        values: { orderBy: { period: 'desc' }, take: 1 },
        perspective: true,
      },
    });

    const summary = {
      total: kpis.length,
      onTarget: 0,
      warning: 0,
      critical: 0,
      noData: 0,
      byPerspective: {},
    };

    kpis.forEach((kpi) => {
      const latest = kpi.values[0];
      const status = latest?.status || 'NO_DATA';
      if (status === 'ON_TARGET' || status === 'EXCEEDED') summary.onTarget++;
      else if (status === 'WARNING') summary.warning++;
      else if (status === 'CRITICAL') summary.critical++;
      else summary.noData++;

      if (kpi.perspective) {
        if (!summary.byPerspective[kpi.perspective.name]) {
          summary.byPerspective[kpi.perspective.name] = { total: 0, onTarget: 0, warning: 0, critical: 0, color: kpi.perspective.color };
        }
        summary.byPerspective[kpi.perspective.name].total++;
        if (status === 'ON_TARGET' || status === 'EXCEEDED') summary.byPerspective[kpi.perspective.name].onTarget++;
        else if (status === 'WARNING') summary.byPerspective[kpi.perspective.name].warning++;
        else if (status === 'CRITICAL') summary.byPerspective[kpi.perspective.name].critical++;
      }
    });

    summary.overallScore = summary.total > 0
      ? Math.round(((summary.onTarget * 100 + summary.warning * 60) / summary.total))
      : 0;

    res.json(summary);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
