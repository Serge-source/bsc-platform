const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Cycles
router.get('/cycles', async (req, res, next) => {
  try {
    const cycles = await prisma.oKRCycle.findMany({
      where: { tenantId: req.tenantId },
      include: { objectives: { include: { keyResults: true } } },
      orderBy: { startDate: 'desc' },
    });
    res.json(cycles);
  } catch (err) { next(err); }
});

router.post('/cycles', async (req, res, next) => {
  try {
    const cycle = await prisma.oKRCycle.create({ data: { tenantId: req.tenantId, ...req.body } });
    res.status(201).json(cycle);
  } catch (err) { next(err); }
});

router.put('/cycles/:id', async (req, res, next) => {
  try {
    const cycle = await prisma.oKRCycle.update({ where: { id: req.params.id }, data: req.body });
    res.json(cycle);
  } catch (err) { next(err); }
});

router.delete('/cycles/:id', async (req, res, next) => {
  try {
    await prisma.oKRCycle.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// Objectives
router.get('/objectives', async (req, res, next) => {
  try {
    const { cycleId } = req.query;
    const where = { tenantId: req.tenantId };
    if (cycleId) where.cycleId = cycleId;
    const objectives = await prisma.oKRObjective.findMany({
      where,
      include: { keyResults: { include: { checkIns: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(objectives);
  } catch (err) { next(err); }
});

router.post('/objectives', async (req, res, next) => {
  try {
    const obj = await prisma.oKRObjective.create({
      data: { tenantId: req.tenantId, ...req.body },
      include: { keyResults: true },
    });
    res.status(201).json(obj);
  } catch (err) { next(err); }
});

router.put('/objectives/:id', async (req, res, next) => {
  try {
    const obj = await prisma.oKRObjective.update({ where: { id: req.params.id }, data: req.body });
    res.json(obj);
  } catch (err) { next(err); }
});

router.delete('/objectives/:id', async (req, res, next) => {
  try {
    await prisma.oKRObjective.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// Key Results
router.post('/objectives/:objId/key-results', async (req, res, next) => {
  try {
    const kr = await prisma.oKRKeyResult.create({ data: { objectiveId: req.params.objId, ...req.body } });
    res.status(201).json(kr);
  } catch (err) { next(err); }
});

router.put('/key-results/:id', async (req, res, next) => {
  try {
    const { current, ...data } = req.body;
    const kr = await prisma.oKRKeyResult.update({ where: { id: req.params.id }, data: { current, ...data } });
    // Recalculate parent objective progress
    const allKRs = await prisma.oKRKeyResult.findMany({ where: { objectiveId: kr.objectiveId } });
    const avg = allKRs.reduce((s, k) => s + Math.min(100, ((k.current - k.baseline) / Math.max(1, k.target - k.baseline)) * 100), 0) / allKRs.length;
    await prisma.oKRObjective.update({ where: { id: kr.objectiveId }, data: { progress: Math.max(0, Math.min(100, avg)) } });
    res.json(kr);
  } catch (err) { next(err); }
});

router.delete('/key-results/:id', async (req, res, next) => {
  try {
    await prisma.oKRKeyResult.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// Check-ins
router.post('/key-results/:krId/check-ins', async (req, res, next) => {
  try {
    const checkIn = await prisma.oKRCheckIn.create({ data: { keyResultId: req.params.krId, ...req.body } });
    // Update KR current value
    await prisma.oKRKeyResult.update({ where: { id: req.params.krId }, data: { current: req.body.value } });
    res.status(201).json(checkIn);
  } catch (err) { next(err); }
});

module.exports = router;
