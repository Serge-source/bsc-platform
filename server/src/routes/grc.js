const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Policies
router.get('/policies', async (req, res, next) => {
  try {
    const policies = await prisma.governancePolicy.findMany({
      where: { tenantId: req.tenantId },
      include: { requirements: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(policies);
  } catch (err) { next(err); }
});

router.post('/policies', async (req, res, next) => {
  try {
    const p = await prisma.governancePolicy.create({ data: { tenantId: req.tenantId, ...req.body }, include: { requirements: true } });
    res.status(201).json(p);
  } catch (err) { next(err); }
});

router.put('/policies/:id', async (req, res, next) => {
  try {
    const p = await prisma.governancePolicy.update({ where: { id: req.params.id }, data: req.body, include: { requirements: true } });
    res.json(p);
  } catch (err) { next(err); }
});

router.delete('/policies/:id', async (req, res, next) => {
  try {
    await prisma.governancePolicy.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// Compliance Requirements
router.post('/policies/:policyId/requirements', async (req, res, next) => {
  try {
    const r = await prisma.complianceRequirement.create({ data: { policyId: req.params.policyId, tenantId: req.tenantId, ...req.body } });
    res.status(201).json(r);
  } catch (err) { next(err); }
});

router.put('/requirements/:id', async (req, res, next) => {
  try {
    const r = await prisma.complianceRequirement.update({ where: { id: req.params.id }, data: req.body });
    res.json(r);
  } catch (err) { next(err); }
});

router.delete('/requirements/:id', async (req, res, next) => {
  try {
    await prisma.complianceRequirement.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// Audit Items
router.get('/audit', async (req, res, next) => {
  try {
    const items = await prisma.auditItem.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) { next(err); }
});

router.post('/audit', async (req, res, next) => {
  try {
    const item = await prisma.auditItem.create({ data: { tenantId: req.tenantId, ...req.body } });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/audit/:id', async (req, res, next) => {
  try {
    const item = await prisma.auditItem.update({ where: { id: req.params.id }, data: req.body });
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/audit/:id', async (req, res, next) => {
  try {
    await prisma.auditItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// GRC Summary
router.get('/summary', async (req, res, next) => {
  try {
    const [policies, requirements, auditItems] = await Promise.all([
      prisma.governancePolicy.findMany({ where: { tenantId: req.tenantId }, select: { status: true } }),
      prisma.complianceRequirement.findMany({ where: { tenantId: req.tenantId }, select: { status: true } }),
      prisma.auditItem.findMany({ where: { tenantId: req.tenantId }, select: { status: true, priority: true } }),
    ]);
    const compliant = requirements.filter(r => r.status === 'COMPLIANT').length;
    const complianceScore = requirements.length ? Math.round((compliant / requirements.length) * 100) : 0;
    res.json({
      policies: policies.length,
      activePolicies: policies.filter(p => p.status === 'ACTIVE').length,
      requirements: requirements.length,
      compliant,
      complianceScore,
      openAudits: auditItems.filter(a => a.status === 'OPEN').length,
      criticalAudits: auditItems.filter(a => a.priority === 'CRITICAL' && a.status === 'OPEN').length,
    });
  } catch (err) { next(err); }
});

module.exports = router;
