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

module.exports = router;
