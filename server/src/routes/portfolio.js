const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Portfolios
router.get('/', async (req, res, next) => {
  try {
    const portfolios = await prisma.portfolio.findMany({
      where: { tenantId: req.tenantId },
      include: {
        programs: {
          include: {
            projects: { include: { milestones: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(portfolios);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const p = await prisma.portfolio.create({ data: { tenantId: req.tenantId, ...req.body } });
    res.status(201).json(p);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const p = await prisma.portfolio.update({ where: { id: req.params.id }, data: req.body });
    res.json(p);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.portfolio.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// Programs
router.post('/programs', async (req, res, next) => {
  try {
    const p = await prisma.portfolioProgram.create({ data: { tenantId: req.tenantId, ...req.body }, include: { projects: true } });
    res.status(201).json(p);
  } catch (err) { next(err); }
});

router.put('/programs/:id', async (req, res, next) => {
  try {
    const p = await prisma.portfolioProgram.update({ where: { id: req.params.id }, data: req.body });
    res.json(p);
  } catch (err) { next(err); }
});

router.delete('/programs/:id', async (req, res, next) => {
  try {
    await prisma.portfolioProgram.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// Projects
router.post('/projects', async (req, res, next) => {
  try {
    const p = await prisma.portfolioProject.create({ data: { tenantId: req.tenantId, ...req.body }, include: { milestones: true } });
    res.status(201).json(p);
  } catch (err) { next(err); }
});

router.put('/projects/:id', async (req, res, next) => {
  try {
    const p = await prisma.portfolioProject.update({ where: { id: req.params.id }, data: req.body });
    res.json(p);
  } catch (err) { next(err); }
});

router.delete('/projects/:id', async (req, res, next) => {
  try {
    await prisma.portfolioProject.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// Milestones
router.post('/projects/:projectId/milestones', async (req, res, next) => {
  try {
    const m = await prisma.pPMMilestone.create({ data: { projectId: req.params.projectId, ...req.body } });
    res.status(201).json(m);
  } catch (err) { next(err); }
});

router.put('/milestones/:id', async (req, res, next) => {
  try {
    const m = await prisma.pPMMilestone.update({ where: { id: req.params.id }, data: req.body });
    res.json(m);
  } catch (err) { next(err); }
});

// Summary
router.get('/summary', async (req, res, next) => {
  try {
    const [portfolios, programs, projects, milestones] = await Promise.all([
      prisma.portfolio.count({ where: { tenantId: req.tenantId } }),
      prisma.portfolioProgram.count({ where: { tenantId: req.tenantId } }),
      prisma.portfolioProject.findMany({ where: { tenantId: req.tenantId }, select: { status: true, budget: true, spent: true, progress: true } }),
      prisma.pPMMilestone.count({ where: { project: { tenantId: req.tenantId }, status: 'PENDING', dueDate: { lte: new Date() } } }),
    ]);
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
    const totalSpent = projects.reduce((s, p) => s + (p.spent || 0), 0);
    const avgProgress = projects.length ? projects.reduce((s, p) => s + p.progress, 0) / projects.length : 0;
    res.json({ portfolios, programs, projects: projects.length, overdueMilestones: milestones, totalBudget, totalSpent, avgProgress });
  } catch (err) { next(err); }
});

module.exports = router;
