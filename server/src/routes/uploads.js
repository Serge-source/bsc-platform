const router = require('express').Router();
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { category, tags } = req.body;

    // In production: upload to S3/R2 and return public URL
    // For now, store as base64 for development (replace with real storage)
    const fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const attachment = await prisma.attachment.create({
      data: {
        tenantId: req.tenantId,
        name: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        mimeType: req.file.mimetype,
        category: category || 'general',
        tags: tags ? tags.split(',').map((t) => t.trim()) : [],
        uploadedById: req.user?.id,
      },
    });

    res.json(attachment);
  } catch (err) { next(err); }
});

// POST /api/uploads/import-kpi-values — bulk Excel/CSV import
router.post('/import-kpi-values', upload.single('file'), async (req, res, next) => {
  try {
    const XLSX = require('xlsx');
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const results = { success: 0, errors: [] };
    for (const row of rows) {
      try {
        const kpi = await prisma.kPI.findFirst({
          where: { tenantId: req.tenantId, name: { equals: row['KPI Name'], mode: 'insensitive' } },
        });
        if (!kpi) { results.errors.push(`KPI not found: ${row['KPI Name']}`); continue; }

        await prisma.kPIValue.upsert({
          where: { kpiId_period: { kpiId: kpi.id, period: row['Period'] } },
          create: { kpiId: kpi.id, period: row['Period'], year: Number(row['Year']), month: Number(row['Month']) || null, actual: Number(row['Actual']), target: Number(row['Target']) || kpi.target },
          update: { actual: Number(row['Actual']), target: Number(row['Target']) || kpi.target },
        });
        results.success++;
      } catch (e) {
        results.errors.push(`Row ${rows.indexOf(row) + 2}: ${e.message}`);
      }
    }

    res.json(results);
  } catch (err) { next(err); }
});

module.exports = router;
