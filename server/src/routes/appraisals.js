const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Cycles
router.get('/cycles', async (req, res, next) => {
  try {
    const cycles = await prisma.appraisalCycle.findMany({
      where: { tenantId: req.tenantId },
      include: { _count: { select: { forms: true } } },
      orderBy: { year: 'desc' },
    });
    res.json(cycles);
  } catch (err) { next(err); }
});

router.post('/cycles', async (req, res, next) => {
  try {
    const cycle = await prisma.appraisalCycle.create({ data: { tenantId: req.tenantId, ...req.body } });
    res.status(201).json(cycle);
  } catch (err) { next(err); }
});

router.put('/cycles/:id', async (req, res, next) => {
  try {
    const cycle = await prisma.appraisalCycle.update({ where: { id: req.params.id }, data: req.body });
    res.json(cycle);
  } catch (err) { next(err); }
});

// Forms
router.get('/forms', async (req, res, next) => {
  try {
    const { cycleId, employeeId } = req.query;
    const where = { tenantId: req.tenantId };
    if (cycleId) where.cycleId = cycleId;
    if (employeeId) where.employeeId = employeeId;
    const forms = await prisma.appraisalForm.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, title: true, department: true } },
        cycle: true,
        objectives: true,
        competencies: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(forms);
  } catch (err) { next(err); }
});

router.post('/forms', async (req, res, next) => {
  try {
    const { objectives = [], competencies = [], ...data } = req.body;
    const form = await prisma.appraisalForm.create({
      data: {
        tenantId: req.tenantId,
        ...data,
        objectives: objectives.length ? { create: objectives } : undefined,
        competencies: competencies.length ? { create: competencies } : undefined,
      },
      include: { employee: { select: { firstName: true, lastName: true } }, objectives: true, competencies: true },
    });
    res.status(201).json(form);
  } catch (err) { next(err); }
});

router.put('/forms/:id', async (req, res, next) => {
  try {
    const { objectives, competencies, ...data } = req.body;
    const form = await prisma.appraisalForm.update({
      where: { id: req.params.id },
      data,
      include: { objectives: true, competencies: true },
    });
    res.json(form);
  } catch (err) { next(err); }
});

// Objectives within a form
router.post('/forms/:formId/objectives', async (req, res, next) => {
  try {
    const obj = await prisma.appraisalObjective.create({ data: { formId: req.params.formId, ...req.body } });
    res.status(201).json(obj);
  } catch (err) { next(err); }
});

router.put('/objectives/:id', async (req, res, next) => {
  try {
    const obj = await prisma.appraisalObjective.update({ where: { id: req.params.id }, data: req.body });
    res.json(obj);
  } catch (err) { next(err); }
});

// Competencies within a form
router.post('/forms/:formId/competencies', async (req, res, next) => {
  try {
    const comp = await prisma.appraisalCompetency.create({ data: { formId: req.params.formId, ...req.body } });
    res.status(201).json(comp);
  } catch (err) { next(err); }
});

router.put('/competencies/:id', async (req, res, next) => {
  try {
    const comp = await prisma.appraisalCompetency.update({ where: { id: req.params.id }, data: req.body });
    res.json(comp);
  } catch (err) { next(err); }
});

module.exports = router;
