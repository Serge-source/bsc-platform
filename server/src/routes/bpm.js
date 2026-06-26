const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const processes = await prisma.businessProcess.findMany({
      where: { tenantId: req.tenantId },
      include: { steps: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(processes);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { steps = [], ...data } = req.body;
    const process = await prisma.businessProcess.create({
      data: {
        tenantId: req.tenantId,
        ...data,
        steps: steps.length ? { create: steps.map((s, i) => ({ ...s, order: i })) } : undefined,
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    res.status(201).json(process);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { steps, ...data } = req.body;
    const process = await prisma.businessProcess.update({ where: { id: req.params.id }, data, include: { steps: true } });
    if (steps) {
      await prisma.processStep.deleteMany({ where: { processId: req.params.id } });
      if (steps.length) await prisma.processStep.createMany({ data: steps.map((s, i) => ({ ...s, processId: req.params.id, order: i })) });
    }
    res.json(process);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.businessProcess.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

router.post('/:id/steps', async (req, res, next) => {
  try {
    const count = await prisma.processStep.count({ where: { processId: req.params.id } });
    const step = await prisma.processStep.create({ data: { processId: req.params.id, order: count, ...req.body } });
    res.status(201).json(step);
  } catch (err) { next(err); }
});

router.put('/steps/:id', async (req, res, next) => {
  try {
    const step = await prisma.processStep.update({ where: { id: req.params.id }, data: req.body });
    res.json(step);
  } catch (err) { next(err); }
});

router.delete('/steps/:id', async (req, res, next) => {
  try {
    await prisma.processStep.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
