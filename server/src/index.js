require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { authenticate } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const tenantsRoutes = require('./routes/tenants');
const organizationsRoutes = require('./routes/organizations');
const departmentsRoutes = require('./routes/departments');
const rolesRoutes = require('./routes/roles');
const strategiesRoutes = require('./routes/strategies');
const objectivesRoutes = require('./routes/objectives');
const perspectivesRoutes = require('./routes/perspectives');
const scorecardsRoutes = require('./routes/scorecards');
const kpisRoutes = require('./routes/kpis');
const kpiValuesRoutes = require('./routes/kpiValues');
const initiativesRoutes = require('./routes/initiatives');
const tasksRoutes = require('./routes/tasks');
const risksRoutes = require('./routes/risks');
const budgetsRoutes = require('./routes/budgets');
const meetingsRoutes = require('./routes/meetings');
const reportsRoutes = require('./routes/reports');
const dashboardsRoutes = require('./routes/dashboards');
const notificationsRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');
const uploadsRoutes = require('./routes/uploads');
const adminRoutes = require('./routes/admin');
const stripeRoutes = require('./routes/stripe');
const okrsRoutes = require('./routes/okrs');
const portfolioRoutes = require('./routes/portfolio');
const bpmRoutes = require('./routes/bpm');
const grcRoutes = require('./routes/grc');
const appraisalsRoutes = require('./routes/appraisals');
const scenariosRoutes = require('./routes/scenarios');

const app = express();
const server = http.createServer(app);

// Socket.io for real-time notifications
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(`user:${userId}`));
  socket.on('join-tenant', (tenantId) => socket.join(`tenant:${tenantId}`));
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// Stripe webhook must use raw body
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stripe', stripeRoutes);

// Protected routes
app.use('/api/tenants', authenticate, tenantsRoutes);
app.use('/api/users', authenticate, usersRoutes);
app.use('/api/organizations', authenticate, organizationsRoutes);
app.use('/api/departments', authenticate, departmentsRoutes);
app.use('/api/roles', authenticate, rolesRoutes);
app.use('/api/strategies', authenticate, strategiesRoutes);
app.use('/api/objectives', authenticate, objectivesRoutes);
app.use('/api/perspectives', authenticate, perspectivesRoutes);
app.use('/api/scorecards', authenticate, scorecardsRoutes);
app.use('/api/kpis', authenticate, kpisRoutes);
app.use('/api/kpi-values', authenticate, kpiValuesRoutes);
app.use('/api/initiatives', authenticate, initiativesRoutes);
app.use('/api/tasks', authenticate, tasksRoutes);
app.use('/api/risks', authenticate, risksRoutes);
app.use('/api/budgets', authenticate, budgetsRoutes);
app.use('/api/meetings', authenticate, meetingsRoutes);
app.use('/api/reports', authenticate, reportsRoutes);
app.use('/api/dashboards', authenticate, dashboardsRoutes);
app.use('/api/notifications', authenticate, notificationsRoutes);
app.use('/api/ai', authenticate, aiRoutes);
app.use('/api/uploads', authenticate, uploadsRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/okrs', authenticate, okrsRoutes);
app.use('/api/portfolio', authenticate, portfolioRoutes);
app.use('/api/bpm', authenticate, bpmRoutes);
app.use('/api/grc', authenticate, grcRoutes);
app.use('/api/appraisals', authenticate, appraisalsRoutes);
app.use('/api/scenarios', authenticate, scenariosRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`BSC Platform server running on port ${PORT}`);
});
