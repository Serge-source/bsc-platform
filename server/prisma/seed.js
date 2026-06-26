const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-corp' },
    update: {},
    create: {
      name: 'Demo Corporation',
      slug: 'demo-corp',
      plan: 'ENTERPRISE',
      primaryColor: '#1d4ed8',
    },
  });

  // Create organization
  const org = await prisma.organization.upsert({
    where: { id: tenant.id },
    update: {},
    create: {
      id: tenant.id,
      tenantId: tenant.id,
      name: 'Demo Corporation',
      mission: 'To deliver outstanding value to our customers through innovation and excellence.',
      vision: 'To be the leading organization in our industry by 2030.',
      values: 'Integrity, Innovation, Customer Focus, Excellence, Teamwork',
      currency: 'USD',
      fiscalYear: 1,
    },
  });

  // Departments
  const depts = await Promise.all([
    prisma.department.upsert({ where: { id: 'dept-finance' }, update: {}, create: { id: 'dept-finance', tenantId: tenant.id, organizationId: org.id, name: 'Finance', code: 'FIN' } }),
    prisma.department.upsert({ where: { id: 'dept-customer' }, update: {}, create: { id: 'dept-customer', tenantId: tenant.id, organizationId: org.id, name: 'Customer Services', code: 'CS' } }),
    prisma.department.upsert({ where: { id: 'dept-ops' }, update: {}, create: { id: 'dept-ops', tenantId: tenant.id, organizationId: org.id, name: 'Operations', code: 'OPS' } }),
    prisma.department.upsert({ where: { id: 'dept-hr' }, update: {}, create: { id: 'dept-hr', tenantId: tenant.id, organizationId: org.id, name: 'Human Resources', code: 'HR' } }),
    prisma.department.upsert({ where: { id: 'dept-it' }, update: {}, create: { id: 'dept-it', tenantId: tenant.id, organizationId: org.id, name: 'Information Technology', code: 'IT' } }),
  ]);

  // Perspectives
  const perspData = [
    { id: 'persp-financial', name: 'Financial', color: '#16a34a', icon: '💰', order: 0 },
    { id: 'persp-customer', name: 'Customer', color: '#3b82f6', icon: '👥', order: 1 },
    { id: 'persp-internal', name: 'Internal Processes', color: '#f59e0b', icon: '⚙️', order: 2 },
    { id: 'persp-learning', name: 'Learning & Growth', color: '#8b5cf6', icon: '📈', order: 3 },
    { id: 'persp-risk', name: 'Risk & Compliance', color: '#ef4444', icon: '🛡️', order: 4 },
    { id: 'persp-esg', name: 'ESG / Sustainability', color: '#059669', icon: '🌿', order: 5 },
  ];
  for (const p of perspData) {
    await prisma.perspective.upsert({ where: { id: p.id }, update: {}, create: { ...p, tenantId: tenant.id, isDefault: true } });
  }

  // Admin role
  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Admin' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Admin', isSystem: true },
  });

  // Viewer role
  const viewerRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Viewer' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Viewer', isSystem: true },
  });

  // Manager role
  const managerRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Manager' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Manager', isSystem: true },
  });

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      password: await bcrypt.hash('Admin123!', 12),
      firstName: 'System',
      lastName: 'Administrator',
      title: 'CEO',
      isActive: true,
      emailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  // Strategy
  const strategy = await prisma.strategy.upsert({
    where: { id: 'strat-2026' },
    update: {},
    create: {
      id: 'strat-2026',
      organizationId: org.id,
      name: 'Corporate Strategy 2026–2030',
      description: 'Five-year strategic plan focused on growth, digital transformation, and sustainability.',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2030-12-31'),
      status: 'ACTIVE',
      isActive: true,
    },
  });

  // Themes
  const themes = await Promise.all([
    prisma.strategicTheme.upsert({ where: { id: 'theme-growth' }, update: {}, create: { id: 'theme-growth', strategyId: strategy.id, name: 'Revenue Growth', color: '#16a34a', order: 0 } }),
    prisma.strategicTheme.upsert({ where: { id: 'theme-cx' }, update: {}, create: { id: 'theme-cx', strategyId: strategy.id, name: 'Customer Excellence', color: '#3b82f6', order: 1 } }),
    prisma.strategicTheme.upsert({ where: { id: 'theme-ops' }, update: {}, create: { id: 'theme-ops', strategyId: strategy.id, name: 'Operational Excellence', color: '#f59e0b', order: 2 } }),
    prisma.strategicTheme.upsert({ where: { id: 'theme-talent' }, update: {}, create: { id: 'theme-talent', strategyId: strategy.id, name: 'Talent & Innovation', color: '#8b5cf6', order: 3 } }),
  ]);

  // Strategic Objectives
  const objectives = [
    { id: 'obj-revenue', strategyId: strategy.id, themeId: 'theme-growth', perspectiveId: 'persp-financial', name: 'Increase Revenue by 20%', priority: 'HIGH' },
    { id: 'obj-cost', strategyId: strategy.id, themeId: 'theme-growth', perspectiveId: 'persp-financial', name: 'Reduce Operating Costs by 10%', priority: 'HIGH' },
    { id: 'obj-csat', strategyId: strategy.id, themeId: 'theme-cx', perspectiveId: 'persp-customer', name: 'Achieve 90% Customer Satisfaction', priority: 'HIGH' },
    { id: 'obj-nps', strategyId: strategy.id, themeId: 'theme-cx', perspectiveId: 'persp-customer', name: 'Improve Net Promoter Score to 70', priority: 'MEDIUM' },
    { id: 'obj-process', strategyId: strategy.id, themeId: 'theme-ops', perspectiveId: 'persp-internal', name: 'Reduce Processing Time by 30%', priority: 'HIGH' },
    { id: 'obj-quality', strategyId: strategy.id, themeId: 'theme-ops', perspectiveId: 'persp-internal', name: 'Achieve Zero-Defect Quality', priority: 'MEDIUM' },
    { id: 'obj-training', strategyId: strategy.id, themeId: 'theme-talent', perspectiveId: 'persp-learning', name: 'Increase Employee Training Hours', priority: 'MEDIUM' },
    { id: 'obj-digital', strategyId: strategy.id, themeId: 'theme-talent', perspectiveId: 'persp-learning', name: 'Complete Digital Transformation', priority: 'HIGH' },
  ];
  for (const obj of objectives) {
    await prisma.strategicObjective.upsert({ where: { id: obj.id }, update: {}, create: { ...obj, status: 'ACTIVE', weight: 1.0 } });
  }

  // KPIs
  const kpiData = [
    { id: 'kpi-revenue', tenantId: tenant.id, perspectiveId: 'persp-financial', objectiveId: 'obj-revenue', departmentId: 'dept-finance', name: 'Annual Revenue', unit: 'USD M', target: 50, warningLevel: 45, criticalLevel: 40, frequency: 'MONTHLY', higherIsBetter: true },
    { id: 'kpi-margin', tenantId: tenant.id, perspectiveId: 'persp-financial', objectiveId: 'obj-cost', departmentId: 'dept-finance', name: 'Operating Margin', unit: '%', target: 25, warningLevel: 20, criticalLevel: 15, frequency: 'MONTHLY', higherIsBetter: true },
    { id: 'kpi-csat', tenantId: tenant.id, perspectiveId: 'persp-customer', objectiveId: 'obj-csat', departmentId: 'dept-customer', name: 'Customer Satisfaction Score', unit: '%', target: 90, warningLevel: 80, criticalLevel: 70, frequency: 'MONTHLY', higherIsBetter: true },
    { id: 'kpi-nps', tenantId: tenant.id, perspectiveId: 'persp-customer', objectiveId: 'obj-nps', departmentId: 'dept-customer', name: 'Net Promoter Score', unit: 'Score', target: 70, warningLevel: 50, criticalLevel: 30, frequency: 'QUARTERLY', higherIsBetter: true },
    { id: 'kpi-proctime', tenantId: tenant.id, perspectiveId: 'persp-internal', objectiveId: 'obj-process', departmentId: 'dept-ops', name: 'Average Processing Time', unit: 'Days', target: 5, warningLevel: 7, criticalLevel: 10, frequency: 'MONTHLY', higherIsBetter: false },
    { id: 'kpi-defect', tenantId: tenant.id, perspectiveId: 'persp-internal', objectiveId: 'obj-quality', departmentId: 'dept-ops', name: 'Defect Rate', unit: '%', target: 0.5, warningLevel: 1.0, criticalLevel: 2.0, frequency: 'MONTHLY', higherIsBetter: false },
    { id: 'kpi-training', tenantId: tenant.id, perspectiveId: 'persp-learning', objectiveId: 'obj-training', departmentId: 'dept-hr', name: 'Training Hours per Employee', unit: 'Hours', target: 40, warningLevel: 30, criticalLevel: 20, frequency: 'QUARTERLY', higherIsBetter: true },
    { id: 'kpi-digital', tenantId: tenant.id, perspectiveId: 'persp-learning', objectiveId: 'obj-digital', departmentId: 'dept-it', name: 'Digital Process Automation Rate', unit: '%', target: 80, warningLevel: 60, criticalLevel: 40, frequency: 'QUARTERLY', higherIsBetter: true },
  ];
  for (const kpi of kpiData) {
    await prisma.kPI.upsert({ where: { id: kpi.id }, update: {}, create: { ...kpi, status: 'ACTIVE', showOnDashboard: true } });
  }

  // Sample KPI values (last 6 months)
  const periods = [
    { period: '2026-01', year: 2026, month: 1 },
    { period: '2026-02', year: 2026, month: 2 },
    { period: '2026-03', year: 2026, month: 3 },
    { period: '2026-04', year: 2026, month: 4 },
    { period: '2026-05', year: 2026, month: 5 },
    { period: '2026-06', year: 2026, month: 6 },
  ];

  const kpiValues = {
    'kpi-revenue': [38, 41, 40, 43, 45, 47],
    'kpi-margin': [22, 23, 21, 24, 24, 25],
    'kpi-csat': [85, 87, 84, 88, 89, 91],
    'kpi-nps': [55, 58, 56, 62, 65, 68],
    'kpi-proctime': [8, 7, 7, 6, 6, 5],
    'kpi-defect': [1.2, 1.0, 0.9, 0.8, 0.7, 0.6],
    'kpi-training': [8, 9, 10, 11, 10, 12],
    'kpi-digital': [45, 50, 55, 58, 62, 65],
  };

  for (const [kpiId, values] of Object.entries(kpiValues)) {
    const kpi = kpiData.find((k) => k.id === kpiId);
    for (let i = 0; i < periods.length; i++) {
      const actual = values[i];
      const target = kpi.target;
      const variance = actual - target;
      const variancePct = (variance / target) * 100;
      let status;
      if (kpi.higherIsBetter) {
        status = actual >= target ? 'ON_TARGET' : actual >= kpi.warningLevel ? 'WARNING' : 'CRITICAL';
        if (actual > target) status = 'EXCEEDED';
      } else {
        status = actual <= target ? 'ON_TARGET' : actual <= kpi.warningLevel ? 'WARNING' : 'CRITICAL';
      }
      await prisma.kPIValue.upsert({
        where: { kpiId_period: { kpiId, period: periods[i].period } },
        update: { actual, variance, variancePct, status },
        create: { kpiId, actual, target, variance, variancePct, status, ...periods[i] },
      });
    }
  }

  // Corporate Scorecard
  await prisma.scorecard.upsert({
    where: { id: 'sc-corporate-2026' },
    update: {},
    create: {
      id: 'sc-corporate-2026',
      tenantId: tenant.id,
      organizationId: org.id,
      strategyId: strategy.id,
      name: 'Corporate Scorecard 2026',
      type: 'CORPORATE',
      period: '2026',
      year: 2026,
      status: 'ACTIVE',
    },
  });

  // Sample risks
  const risksData = [
    { id: 'risk-cyber', organizationId: org.id, tenantId: tenant.id, name: 'Cybersecurity Breach', category: 'Technology', likelihood: 3, impact: 5 },
    { id: 'risk-talent', organizationId: org.id, tenantId: tenant.id, name: 'Key Talent Attrition', category: 'Human Resources', likelihood: 4, impact: 4 },
    { id: 'risk-market', organizationId: org.id, tenantId: tenant.id, name: 'Market Share Loss', category: 'Strategic', likelihood: 2, impact: 5 },
    { id: 'risk-regulatory', organizationId: org.id, tenantId: tenant.id, name: 'Regulatory Non-Compliance', category: 'Compliance', likelihood: 2, impact: 4 },
  ];
  for (const risk of risksData) {
    await prisma.risk.upsert({
      where: { id: risk.id },
      update: {},
      create: { ...risk, inherentScore: risk.likelihood * risk.impact, status: 'OPEN' },
    });
  }

  console.log('Seed complete!');
  console.log('Login: admin@demo.com / Admin123!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
