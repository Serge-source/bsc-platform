const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const Anthropic = require('@anthropic-ai/sdk');
const prisma = new PrismaClient();
const client = new Anthropic();

router.get('/', async (req, res, next) => {
  try {
    const scenarios = await prisma.scenario.findMany({
      where: { tenantId: req.tenantId },
      include: { assumptions: true, kpiImpacts: { include: { kpi: { select: { name: true, unit: true, target: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(scenarios);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { assumptions = [], kpiImpacts = [], ...data } = req.body;
    const scenario = await prisma.scenario.create({
      data: {
        tenantId: req.tenantId,
        ...data,
        assumptions: assumptions.length ? { create: assumptions } : undefined,
      },
      include: { assumptions: true, kpiImpacts: true },
    });
    res.status(201).json(scenario);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { assumptions, kpiImpacts, ...data } = req.body;
    const scenario = await prisma.scenario.update({ where: { id: req.params.id }, data, include: { assumptions: true } });
    res.json(scenario);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.scenario.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

router.post('/:id/assumptions', async (req, res, next) => {
  try {
    const a = await prisma.scenarioAssumption.create({ data: { scenarioId: req.params.id, ...req.body } });
    res.status(201).json(a);
  } catch (err) { next(err); }
});

router.put('/assumptions/:id', async (req, res, next) => {
  try {
    const a = await prisma.scenarioAssumption.update({ where: { id: req.params.id }, data: req.body });
    res.json(a);
  } catch (err) { next(err); }
});

router.delete('/assumptions/:id', async (req, res, next) => {
  try {
    await prisma.scenarioAssumption.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// KPI impact upsert
router.post('/:id/kpi-impacts', async (req, res, next) => {
  try {
    const { kpiId, ...data } = req.body;
    const impact = await prisma.scenarioKPIImpact.upsert({
      where: { scenarioId_kpiId: { scenarioId: req.params.id, kpiId } },
      update: data,
      create: { scenarioId: req.params.id, kpiId, ...data },
      include: { kpi: { select: { name: true, unit: true, target: true } } },
    });
    res.json(impact);
  } catch (err) { next(err); }
});

// AI-powered scenario analysis
router.post('/:id/analyze', async (req, res, next) => {
  try {
    const scenario = await prisma.scenario.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        assumptions: true,
        kpiImpacts: { include: { kpi: { select: { name: true, unit: true, target: true, values: { orderBy: { period: 'desc' }, take: 3 } } } } },
      },
    });
    if (!scenario) return res.status(404).json({ error: 'Not found' });

    const kpis = await prisma.kPI.findMany({
      where: { tenantId: req.tenantId, status: 'ACTIVE' },
      include: { values: { orderBy: { period: 'desc' }, take: 3 } },
      take: 15,
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Analyze this strategic scenario and provide a structured impact assessment.

Scenario: ${scenario.name} (${scenario.type})
Description: ${scenario.description || 'N/A'}
Probability: ${(scenario.probability * 100).toFixed(0)}%
Horizon: ${scenario.horizon} years

Assumptions:
${scenario.assumptions.map(a => `- ${a.parameter}: ${a.baselineValue} → ${a.projectedValue} (${a.impact} impact)`).join('\n')}

Current KPI Baselines:
${kpis.slice(0, 8).map(k => `- ${k.name}: target ${k.target}${k.unit || ''}, latest ${k.values[0]?.actual || 'N/A'}`).join('\n')}

Provide:
1. Executive summary (2-3 sentences)
2. Key opportunities (3 bullet points)
3. Key risks (3 bullet points)
4. Strategic recommendations (3 bullet points)
5. Confidence assessment (High/Medium/Low with rationale)

Format clearly with headers.`,
      }],
    });

    res.json({ analysis: response.content[0].text, analyzedAt: new Date().toISOString() });
  } catch (err) { next(err); }
});

module.exports = router;
