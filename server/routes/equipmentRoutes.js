const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { Equipment } = require('../models/Equipment');
const { Intervention } = require('../models/Intervention');

const router = express.Router();

// Calculate maintenance metrics for equipment
async function calculateMetrics(equipment) {
  const interventions = await Intervention.find({
    equipment: equipment.location,
    type: { $in: ['Corrective', 'Emergency'] },
    status: 'Completed'
  }).sort({ createdDate: 1 }).lean();

  let mtbf = 0;
  let mttr = 0;
  let downtime = 0;

  if (interventions.length > 1) {
    const intervals = [];
    for (let i = 1; i < interventions.length; i++) {
      intervals.push((interventions[i].createdDate - interventions[i - 1].createdDate) / (1000 * 60 * 60)); // hours
    }
    mtbf = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  if (interventions.length > 0) {
    const durations = interventions.filter(i => i.dueDate).map(i => (i.dueDate - i.createdDate) / (1000 * 60 * 60));
    if (durations.length > 0) {
      mttr = durations.reduce((a, b) => a + b, 0) / durations.length;
      downtime = durations.reduce((a, b) => a + b, 0);
    }
  }

  // Add current downtime if equipment is not online
  let currentDowntime = 0;
  if (equipment.status !== 'online' && equipment.lastStatusChange) {
    currentDowntime = (Date.now() - new Date(equipment.lastStatusChange).getTime()) / (1000 * 60 * 60); // hours
    downtime += currentDowntime;
  }

  let timeSinceAcquisition = 0;
  let operatingTime = 0;
  let availability = 0;

  if (equipment.installationDate) {
    timeSinceAcquisition = (Date.now() - new Date(equipment.installationDate).getTime()) / (1000 * 60 * 60 * 24); // days
    operatingTime = timeSinceAcquisition * 24 - downtime; // hours
    if (timeSinceAcquisition * 24 > 0) {
      availability = (operatingTime / (timeSinceAcquisition * 24)) * 100;
    }
  }

  // If equipment is currently not online, set availability to 0
  if (equipment.status !== 'online') {
    availability = 0;
  }

  return {
    mtbf: Math.round(mtbf * 100) / 100,
    mttr: Math.round(mttr * 100) / 100,
    timeSinceAcquisition: Math.round(timeSinceAcquisition * 100) / 100,
    operatingTime: Math.round(operatingTime * 100) / 100,
    downtime: Math.round(downtime * 100) / 100,
    availability: Math.round(availability * 100) / 100
  };
}

// GET /api/equipment (with basic pagination & filters)
router.get('/', requireUser, async (req, res) => {
  const { page = 1, limit = 50, status, category, q, sort = 'createdAt', order = 'desc' } = req.query || {};
  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (q) query.$or = [
    { name: { $regex: q, $options: 'i' } },
    { location: { $regex: q, $options: 'i' } }
  ];
  const skip = (Number(page) - 1) * Number(limit);
  const sortSpec = { [String(sort)]: String(order).toLowerCase() === 'asc' ? 1 : -1 };
  const [items, total] = await Promise.all([
    Equipment.find(query).sort(sortSpec).skip(skip).limit(Number(limit)).populate('category').populate('type').lean(),
    Equipment.countDocuments(query)
  ]);

  // Calculate maintenance metrics for each equipment
  const metricsPromises = items.map(item => calculateMetrics(item));
  const metricsResults = await Promise.all(metricsPromises);
  items.forEach((item, index) => {
    item.mtbf = metricsResults[index].mtbf;
    item.mttr = metricsResults[index].mttr;
    item.timeSinceAcquisition = metricsResults[index].timeSinceAcquisition;
    item.operatingTime = metricsResults[index].operatingTime;
    item.downtime = metricsResults[index].downtime;
    item.availability = metricsResults[index].availability;
  });

  return res.status(200).json({ equipment: items, page: Number(page), total });
});

// GET /api/equipment/:id
router.get('/:id', requireUser, async (req, res) => {
   const { id } = req.params;
   const equipment = await Equipment.findById(id).populate('category').populate('type').lean();
   if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

   // Calculate maintenance metrics
   const metrics = await calculateMetrics(equipment);
   equipment.mtbf = metrics.mtbf;
   equipment.mttr = metrics.mttr;
   equipment.timeSinceAcquisition = metrics.timeSinceAcquisition;
   equipment.operatingTime = metrics.operatingTime;
   equipment.downtime = metrics.downtime;
   equipment.availability = metrics.availability;

   return res.status(200).json({ equipment });
 });
 
// POST /api/equipment
const { z } = require('zod');
const equipmentSchema = z.object({
  category: z.string().min(1), // ObjectId as string
  type: z.string().min(1), // ObjectId as string
  status: z.enum(['online','maintenance','breakdown','offline','scrapped']),
  location: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  chipNumber: z.string().optional(),
  brand: z.string().optional(),
  installationDate: z.coerce.date().optional(),
  lastMaintenance: z.coerce.date().optional(),
  nextMaintenance: z.coerce.date().optional(),
});

router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const parse = equipmentSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await Equipment.create(parse.data);
  const populated = await Equipment.findById(created._id).populate('category').populate('type').lean();
  return res.status(201).json({ success: true, equipment: populated });
});

// PATCH /api/equipment/:id
router.patch('/:id', requireUser, requireRole(['admin','maintenance_manager','assistant_maintenance_manager','foreman']), async (req, res) => {
  const { id } = req.params;
  const updates = (req.body || {});
  const updated = await Equipment.findByIdAndUpdate(id, updates, { new: true }).populate('category').populate('type').lean();
  if (!updated) return res.status(404).json({ message: 'Equipment not found' });
  return res.status(200).json({ success: true, equipment: updated });
});

// DELETE /api/equipment/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const deleted = await Equipment.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Equipment not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;
