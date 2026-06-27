const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Recursively coerce YYYY-MM-DD strings to Date objects in a plain object
function coerceDates(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && DATE_ONLY.test(v)) out[k] = new Date(v + 'T00:00:00.000Z');
    else if (v !== null && typeof v === 'object' && !Array.isArray(v)) out[k] = coerceDates(v);
    else out[k] = v;
  }
  return out;
}

/**
 * Creates standard CRUD router handlers scoped to the current tenant.
 * Each handler automatically filters by tenantId from req.tenantId.
 */
const crudFactory = (model, options = {}) => {
  const {
    include = {},
    orderBy = { createdAt: 'desc' },
    searchFields = [],
    tenantField = 'tenantId',
    extraFilters = () => ({}),
  } = options;

  return {
    list: async (req, res, next) => {
      try {
        const { page = 1, limit = 50, search, orderBy: _ob, sort: _sort, ...filters } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where = {
          [tenantField]: req.tenantId,
          ...extraFilters(req),
        };

        if (search && searchFields.length > 0) {
          where.OR = searchFields.map((f) => ({ [f]: { contains: search, mode: 'insensitive' } }));
        }

        Object.keys(filters).forEach((key) => {
          if (filters[key] !== undefined && filters[key] !== '') {
            const val = filters[key];
            // Coerce query string booleans and numbers
            if (val === 'true') where[key] = true;
            else if (val === 'false') where[key] = false;
            else if (!isNaN(val) && val !== '') where[key] = Number(val);
            else where[key] = val;
          }
        });

        const [items, total] = await Promise.all([
          prisma[model].findMany({ where, include, orderBy, skip, take: Number(limit) }),
          prisma[model].count({ where }),
        ]);

        res.json({ items, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) });
      } catch (err) {
        next(err);
      }
    },

    get: async (req, res, next) => {
      try {
        const item = await prisma[model].findFirst({
          where: { id: req.params.id, [tenantField]: req.tenantId },
          include,
        });
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
      } catch (err) {
        next(err);
      }
    },

    create: async (req, res, next) => {
      try {
        const item = await prisma[model].create({
          data: { [tenantField]: req.tenantId, ...coerceDates(req.body) },
          include,
        });
        res.status(201).json(item);
      } catch (err) {
        next(err);
      }
    },

    update: async (req, res, next) => {
      try {
        const existing = await prisma[model].findFirst({
          where: { id: req.params.id, [tenantField]: req.tenantId },
        });
        if (!existing) return res.status(404).json({ error: 'Not found' });

        const item = await prisma[model].update({
          where: { id: req.params.id },
          data: coerceDates(req.body),
          include,
        });
        res.json(item);
      } catch (err) {
        next(err);
      }
    },

    remove: async (req, res, next) => {
      try {
        const existing = await prisma[model].findFirst({
          where: { id: req.params.id, [tenantField]: req.tenantId },
        });
        if (!existing) return res.status(404).json({ error: 'Not found' });
        await prisma[model].delete({ where: { id: req.params.id } });
        res.json({ message: 'Deleted' });
      } catch (err) {
        next(err);
      }
    },
  };
};

module.exports = crudFactory;
