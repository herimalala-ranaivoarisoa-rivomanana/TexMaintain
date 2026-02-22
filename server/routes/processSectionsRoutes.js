const express = require('express');
const { requireUser } = require('./middleware/auth');
const { z } = require('zod');
const { ProcessSection } = require('../models/ProcessSection');
const { ProcessArea } = require('../models/ProcessArea');
const { Asset } = require('../models/Asset');

const router = express.Router();

const sectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  processArea: z.string().min(1), // ObjectId
  order: z.number().optional()
});

// GET /api/process-sections
router.get('/', requireUser, async (req, res) => {
  const factoryFilter = req.activeFactoryId ? { factory: new mongoose.Types.ObjectId(req.activeFactoryId) } : {};
  const sections = await ProcessSection.find(factoryFilter)
    .populate('processArea', 'name')
    .sort({ processArea: 1, order: 1 })
    .lean();
  return res.status(200).json({ processSections: sections });
});

// POST /api/process-sections
router.post('/', requireUser, async (req, res) => {
  const parse = sectionSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });

  const created = await ProcessSection.create(parse.data);

  // Add to Process Area
  await ProcessArea.findByIdAndUpdate(parse.data.processArea, {
    $push: { sections: { sectionId: created._id, order: parse.data.order || 0 } }
  });

  return res.status(201).json({ success: true, processSection: created });
});

// PATCH /api/process-sections/:id
router.patch('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await ProcessSection.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Process section not found' });
  return res.status(200).json({ success: true, processSection: updated });
});

// DELETE /api/process-sections/:id
router.delete('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const section = await ProcessSection.findById(id);
  if (!section) return res.status(404).json({ message: 'Process section not found' });

  // Remove from Process Area
  await ProcessArea.findByIdAndUpdate(section.processArea, {
    $pull: { sections: { sectionId: id } }
  });

  await ProcessSection.deleteOne({ _id: id });
  return res.status(200).json({ success: true });
});

// PATCH /api/process-sections/:id/asset (Reorder asset within section)
router.patch('/:id/asset', requireUser, async (req, res) => {
  const { id } = req.params;
  const { asset } = req.body; // Array of { assetId, order }

  if (!Array.isArray(asset)) {
    return res.status(400).json({ message: 'Asset must be an array' });
  }

  const updated = await ProcessSection.findByIdAndUpdate(id, { asset }, { new: true })
    .populate('asset.assetId') // Optional populate
    .lean();

  if (!updated) return res.status(404).json({ message: 'Process section not found' });
  return res.status(200).json({ success: true, processSection: updated });
});

module.exports = router;