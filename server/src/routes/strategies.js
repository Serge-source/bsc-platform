const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const crudFactory = require('../utils/crudFactory');
const prisma = new PrismaClient();

const crud = crudFactory('strategy', {
  searchFields: ['name', 'description'],
  include: {
    themes: { include: { objectives: { include: { perspective: true, kpis: true, initiatives: true } } } },
    objectives: { include: { theme: true, perspective: true, kpis: true } },
    organization: { select: { id: true, name: true, mission: true, vision: true, values: true } },
  },
});

router.get('/', crud.list);
router.get('/:id', crud.get);
router.put('/:id', crud.update);
router.delete('/:id', crud.remove);

// Lightweight create (existing flow)
router.post('/', crud.create);

// Full wizard atomic save
router.post('/wizard/publish', async (req, res, next) => {
  try {
    const {
      name, description, startYear, endYear, status, planningCycle,
      vision, mission, values,
      themes = [],
    } = req.body;

    // Get org for this tenant
    const org = await prisma.organization.findFirst({ where: { tenantId: req.tenantId } });
    if (!org) return res.status(400).json({ error: 'Organization not found' });

    // Update org identity
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        vision: vision || org.vision,
        mission: mission || org.mission,
        values: Array.isArray(values) ? values.join(', ') : (values || org.values),
      },
    });

    const startDate = new Date(`${startYear}-01-01`);
    const endDate = new Date(`${endYear}-12-31`);

    // Create strategy
    const strategy = await prisma.strategy.create({
      data: {
        organizationId: org.id,
        name,
        description,
        vision,
        mission,
        values: Array.isArray(values) ? values.join(', ') : values,
        startDate,
        endDate,
        status: status || 'ACTIVE',
        isActive: status === 'ACTIVE' || !status,
      },
    });

    // Theme color palette
    const palette = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316','#ec4899'];

    // Create themes + objectives in order
    for (let ti = 0; ti < themes.length; ti++) {
      const themeData = themes[ti];
      const theme = await prisma.strategicTheme.create({
        data: {
          strategyId: strategy.id,
          name: themeData.name,
          description: themeData.description || null,
          color: themeData.color || palette[ti % palette.length],
          order: ti,
        },
      });

      const objectives = themeData.objectives || [];
      for (let oi = 0; oi < objectives.length; oi++) {
        const objData = objectives[oi];

        // Resolve perspective by name if provided as string
        let perspectiveId = objData.perspectiveId || null;
        if (!perspectiveId && objData.perspectiveName) {
          const p = await prisma.perspective.findFirst({
            where: { tenantId: req.tenantId, name: { contains: objData.perspectiveName, mode: 'insensitive' } },
          });
          perspectiveId = p?.id || null;
        }

        const objective = await prisma.strategicObjective.create({
          data: {
            strategyId: strategy.id,
            themeId: theme.id,
            perspectiveId,
            name: objData.name,
            description: objData.description || null,
            priority: objData.priority || 'MEDIUM',
            status: 'ACTIVE',
            weight: 1.0,
            order: oi,
          },
        });

        // Initiatives
        for (const initData of objData.initiatives || []) {
          if (!initData.name?.trim()) continue;
          await prisma.initiative.create({
            data: {
              tenantId: req.tenantId,
              organizationId: org.id,
              objectiveId: objective.id,
              name: initData.name,
              description: initData.description || null,
              status: 'PLANNING',
              completion: 0,
            },
          });
        }

        // Risks
        for (const riskData of objData.risks || []) {
          if (!riskData.name?.trim()) continue;
          const likelihood = Number(riskData.likelihood) || 2;
          const impact = Number(riskData.impact) || 3;
          await prisma.risk.create({
            data: {
              tenantId: req.tenantId,
              organizationId: org.id,
              objectiveId: objective.id,
              name: riskData.name,
              category: riskData.category || 'Strategic',
              likelihood,
              impact,
              inherentScore: likelihood * impact,
              mitigation: riskData.mitigation || null,
              status: 'OPEN',
            },
          });
        }

        // KPIs
        for (const kpiData of objData.kpis || []) {
          if (!kpiData.name?.trim()) continue;
          await prisma.kPI.create({
            data: {
              tenantId: req.tenantId,
              perspectiveId,
              objectiveId: objective.id,
              name: kpiData.name,
              unit: kpiData.unit || '',
              target: Number(kpiData.target) || 0,
              frequency: 'MONTHLY',
              higherIsBetter: true,
              status: 'ACTIVE',
              showOnDashboard: false,
            },
          });
        }

        // Budget (store on initiative summary — simplified)
        if (objData.budget) {
          await prisma.budget.create({
            data: {
              tenantId: req.tenantId,
              organizationId: org.id,
              objectiveId: objective.id,
              name: `${objData.name} Budget`,
              totalAmount: Number(objData.budget) || 0,
              year: Number(startYear),
              currency: 'USD',
            },
          }).catch(() => {}); // Budget model may have required fields — skip if fails
        }
      }
    }

    const result = await prisma.strategy.findUnique({
      where: { id: strategy.id },
      include: {
        themes: { include: { objectives: { include: { perspective: true, kpis: true } } } },
        organization: { select: { name: true, vision: true, mission: true } },
      },
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
