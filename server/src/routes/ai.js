const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const client = new Anthropic();

const SYSTEM_PROMPT = `You are an expert Strategic Performance Management advisor and Balanced Scorecard analyst.
You help executives and managers understand their organization's performance data, identify risks, and make strategic decisions.
When analyzing data, be concise, actionable, and focus on what matters most.
Use the Balanced Scorecard framework (Financial, Customer, Internal Processes, Learning & Growth) to structure your insights.
Always provide specific, data-driven recommendations.`;

// POST /api/ai/chat — conversational AI with company data context
router.post('/chat', async (req, res, next) => {
  try {
    const { message, conversationId, includeContext = true } = req.body;

    let context = '';
    if (includeContext) {
      const [kpiSummary, risks, initiatives] = await Promise.all([
        prisma.kPI.findMany({
          where: { tenantId: req.tenantId, status: 'ACTIVE' },
          include: { values: { orderBy: { period: 'desc' }, take: 1 }, perspective: true },
          take: 20,
        }),
        prisma.risk.findMany({
          where: { tenantId: req.tenantId, status: 'OPEN' },
          take: 10,
        }),
        prisma.initiative.findMany({
          where: { tenantId: req.tenantId, status: { in: ['IN_PROGRESS', 'PLANNING'] } },
          take: 10,
        }),
      ]);

      context = `\n\nCurrent organizational data context:\n`;
      context += `KPIs (${kpiSummary.length} active):\n`;
      kpiSummary.forEach((kpi) => {
        const latest = kpi.values[0];
        context += `- ${kpi.name} [${kpi.perspective?.name || 'No perspective'}]: `;
        context += latest ? `Actual: ${latest.actual} ${kpi.unit || ''}, Target: ${kpi.target || 'N/A'}, Status: ${latest.status}` : 'No data';
        context += '\n';
      });
      context += `\nOpen Risks (${risks.length}):\n`;
      risks.forEach((r) => { context += `- ${r.name}: Likelihood ${r.likelihood}/5, Impact ${r.impact}/5\n`; });
      context += `\nActive Initiatives (${initiatives.length}):\n`;
      initiatives.forEach((i) => { context += `- ${i.name}: ${i.completion}% complete, Status: ${i.status}\n`; });
    }

    // Load or create conversation
    let conversation = null;
    let messages = [];
    if (conversationId) {
      conversation = await prisma.aIConversation.findFirst({
        where: { id: conversationId, tenantId: req.tenantId },
      });
      if (conversation) messages = conversation.messages;
    }

    messages.push({ role: 'user', content: message });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT + context,
      messages,
    });

    const assistantMessage = response.content[0].text;
    messages.push({ role: 'assistant', content: assistantMessage });

    // Save conversation
    if (conversation) {
      await prisma.aIConversation.update({
        where: { id: conversation.id },
        data: { messages, updatedAt: new Date() },
      });
    } else {
      conversation = await prisma.aIConversation.create({
        data: {
          tenantId: req.tenantId,
          userId: req.user?.id,
          title: message.slice(0, 60),
          messages,
        },
      });
    }

    res.json({ message: assistantMessage, conversationId: conversation.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/generate-report — AI executive report
router.post('/generate-report', async (req, res, next) => {
  try {
    const { type = 'monthly', period } = req.body;

    const [kpis, risks, initiatives, scorecards] = await Promise.all([
      prisma.kPI.findMany({
        where: { tenantId: req.tenantId, status: 'ACTIVE' },
        include: { values: { orderBy: { period: 'desc' }, take: 3 }, perspective: true },
      }),
      prisma.risk.findMany({ where: { tenantId: req.tenantId, status: 'OPEN' } }),
      prisma.initiative.findMany({ where: { tenantId: req.tenantId } }),
      prisma.scorecard.findMany({ where: { tenantId: req.tenantId, status: 'ACTIVE' }, take: 1 }),
    ]);

    const dataContext = JSON.stringify({ kpis: kpis.map(k => ({
      name: k.name, perspective: k.perspective?.name, target: k.target,
      latestActual: k.values[0]?.actual, status: k.values[0]?.status,
    })), risks, initiatives }, null, 2);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Generate a professional ${type} executive report for the period ${period || 'current month'}.
Data: ${dataContext}
Format: Use clear sections: Executive Summary, Performance by Perspective, Key Risks, Initiative Status, Recommendations.
Be specific, data-driven, and actionable.`,
      }],
    });

    res.json({ report: response.content[0].text, generatedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/forecast — KPI forecast
router.post('/forecast', async (req, res, next) => {
  try {
    const { kpiId, periods = 3 } = req.body;

    const kpi = await prisma.kPI.findFirst({
      where: { id: kpiId, tenantId: req.tenantId },
      include: { values: { orderBy: [{ year: 'asc' }, { month: 'asc' }] } },
    });
    if (!kpi) return res.status(404).json({ error: 'KPI not found' });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Forecast the next ${periods} periods for this KPI.
KPI: ${kpi.name}
Target: ${kpi.target} ${kpi.unit || ''}
Historical data: ${JSON.stringify(kpi.values.map(v => ({ period: v.period, actual: v.actual })))}
Provide: predicted values, confidence level, trend analysis, and any risks to achieving target.
Format as JSON: { predictions: [{period, value, confidence}], trend, analysis, risks }`,
      }],
    });

    let result;
    try {
      const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: response.content[0].text };
    } catch {
      result = { analysis: response.content[0].text };
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/generate-strategy — AI-assisted strategic plan draft
router.post('/generate-strategy', async (req, res, next) => {
  try {
    const { orgType, industry, priorities, challenges, framework, orgName } = req.body;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: `You are a world-class strategic planning expert specializing in the Balanced Scorecard methodology by Kaplan & Norton. Generate comprehensive, realistic strategic plans for organizations.`,
      messages: [{
        role: 'user',
        content: `Generate a complete strategic plan draft for the following organization:

Organization Name: ${orgName || 'The Organization'}
Organization Type: ${orgType}
Industry/Sector: ${industry}
Top Priorities: ${priorities}
Key Challenges: ${challenges}
Strategic Framework: ${framework || 'Balanced Scorecard'}

Return ONLY valid JSON with this exact structure (no markdown, no explanation, just JSON):
{
  "name": "strategic plan name (e.g. 2027-2030 Digital Transformation Strategy)",
  "description": "brief description of the plan",
  "vision": "inspiring vision statement (1-2 sentences)",
  "mission": "clear mission statement (1-2 sentences)",
  "values": ["Value1", "Value2", "Value3", "Value4", "Value5"],
  "themes": [
    {
      "name": "theme name",
      "description": "theme description",
      "color": "#hexcolor",
      "objectives": [
        {
          "name": "objective name",
          "description": "detailed description with measurable target",
          "perspectiveName": "Financial|Customer|Internal Processes|Learning & Growth",
          "priority": "HIGH|MEDIUM|LOW",
          "owner": "suggested owner role",
          "kpis": [
            {"name": "KPI name", "unit": "unit of measure", "target": numeric_target}
          ],
          "initiatives": [
            {"name": "initiative name", "description": "brief description"}
          ],
          "risks": [
            {"name": "risk name", "likelihood": 1-5, "impact": 1-5, "mitigation": "mitigation strategy"}
          ]
        }
      ]
    }
  ]
}

Create 4-6 themes with 2-4 objectives each. Make it specific and realistic for the organization type and industry. Use appropriate hex colors for themes.`,
      }],
    });

    const text = response.content[0].text;
    let result;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      if (!result) throw new Error('No JSON found');
    } catch {
      return res.status(422).json({ error: 'AI could not generate a valid plan. Please try again.' });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/copilot — AI Copilot: smart strategic questions + executive report generation
router.post('/copilot', async (req, res, next) => {
  try {
    const { question, type = 'question' } = req.body;

    const [kpis, risks, initiatives, objectives, okrObjectives, scenarios] = await Promise.all([
      prisma.kPI.findMany({
        where: { tenantId: req.tenantId, status: 'ACTIVE' },
        include: { values: { orderBy: { period: 'desc' }, take: 2 }, perspective: true, objective: { select: { name: true } } },
        take: 30,
      }),
      prisma.risk.findMany({ where: { tenantId: req.tenantId, status: 'OPEN' }, include: { objective: { select: { name: true } } }, take: 20 }),
      prisma.initiative.findMany({ where: { tenantId: req.tenantId }, take: 20 }),
      prisma.strategicObjective.findMany({ where: { tenantId: req.tenantId }, include: { kpis: { include: { values: { orderBy: { period: 'desc' }, take: 1 } } } }, take: 20 }),
      prisma.oKRObjective.findMany({ where: { tenantId: req.tenantId }, include: { keyResults: true }, take: 10 }).catch(() => []),
      prisma.scenario.findMany({ where: { tenantId: req.tenantId }, include: { assumptions: true }, take: 5 }).catch(() => []),
    ]);

    // Compute at-risk objectives
    const atRiskObjectives = objectives.filter(obj => {
      const kpiStatuses = obj.kpis.map(k => k.values[0]?.status).filter(Boolean);
      return kpiStatuses.some(s => s === 'RED' || s === 'CRITICAL');
    });

    const contextData = {
      kpis: kpis.map(k => ({
        name: k.name,
        perspective: k.perspective?.name,
        objective: k.objective?.name,
        target: k.target,
        unit: k.unit,
        latestActual: k.values[0]?.actual,
        latestStatus: k.values[0]?.status,
        trend: k.values.length >= 2 ? (k.values[0]?.actual > k.values[1]?.actual ? 'improving' : 'declining') : 'insufficient data',
      })),
      risks: risks.map(r => ({ name: r.name, likelihood: r.likelihood, impact: r.impact, objective: r.objective?.name, score: r.likelihood * r.impact })),
      initiatives: initiatives.map(i => ({ name: i.name, status: i.status, completion: i.completion, budget: i.budget, spent: i.spent })),
      atRiskObjectives: atRiskObjectives.map(o => o.name),
      okrObjectives: okrObjectives.map(o => ({ title: o.title, progress: o.progress, level: o.level })),
      scenarios: scenarios.map(s => ({ name: s.name, type: s.type, probability: s.probability })),
    };

    const systemPrompt = `You are an AI Copilot for an Enterprise Performance Management platform.
You have deep expertise in Balanced Scorecard, OKRs, risk management, and strategic planning.
You provide concise, actionable, data-driven insights to executives and managers.
Format responses with clear structure using markdown headings and bullet points.
Be specific, quantitative when possible, and always prioritize actionability.`;

    const userPrompt = type === 'report'
      ? `Generate a comprehensive quarterly executive performance report based on this organizational data.

Data: ${JSON.stringify(contextData, null, 2)}

Structure the report as:
# Quarterly Executive Report
## Executive Summary (3-4 sentences with key highlights)
## Performance by BSC Perspective
## At-Risk Strategic Objectives
## Top Risks & Mitigations
## Initiative Portfolio Status
## Key Recommendations for Next Quarter

Be specific with numbers and percentages.`
      : `${question}

Use this real organizational data to answer precisely:
${JSON.stringify(contextData, null, 2)}

Provide a structured, actionable answer. Reference specific KPIs, objectives, or initiatives by name where relevant.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    res.json({ answer: response.content[0].text, generatedAt: new Date().toISOString(), dataSnapshot: { kpis: kpis.length, risks: risks.length, initiatives: initiatives.length, atRiskObjectives: atRiskObjectives.length } });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/conversations — list saved conversations
router.get('/conversations', async (req, res, next) => {
  try {
    const conversations = await prisma.aIConversation.findMany({
      where: { tenantId: req.tenantId },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    res.json(conversations);
  } catch (err) { next(err); }
});

module.exports = router;
