const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Equipment } = require('../models/Equipment');
const { Intervention } = require('../models/Intervention');
const { Part } = require('../models/Part');

// Helper to calculate stock status (duplicating logic from Part model for aggregation if needed, 
// but for simple counts we can fetch and filter or use aggregation)

// GET /api/reports/stats - General Dashboard Stats
router.get('/stats', async (req, res) => {
  try {
    const [
      equipmentCount,
      activeInterventions,
      parts
    ] = await Promise.all([
      Equipment.countDocuments(),
      Intervention.countDocuments({ status: { $nin: ['Completed', 'Cancelled'] } }),
      Part.find({}, 'currentStock minStock maxStock unitPrice')
    ]);

    let lowStockCount = 0;
    let totalStockValue = 0;

    parts.forEach(part => {
      // Calculate stock value
      totalStockValue += (part.currentStock || 0) * (part.unitPrice || 0);

      // Check low stock (logic from Part model)
      if (part.currentStock <= part.minStock) {
        lowStockCount++;
      }
    });

    res.json({
      equipmentCount,
      activeInterventions,
      lowStockParts: lowStockCount,
      totalStockValue: Math.round(totalStockValue * 100) / 100
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({ message: 'Error fetching report stats' });
  }
});

// GET /api/reports/maintenance - Maintenance Metrics
router.get('/maintenance', async (req, res) => {
  try {
    // Calculate averages for MTBF and MTTR from Equipment
    const equipmentMetrics = await Equipment.aggregate([
      {
        $group: {
          _id: null,
          avgMtbf: { $avg: '$mtbf' },
          avgMttr: { $avg: '$mttr' }
        }
      }
    ]);

    // Group interventions by type
    const interventionsByType = await Intervention.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Group interventions by status
    const interventionsByStatus = await Intervention.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly intervention costs (Simulated based on intervention count * average cost factor for now, 
    // as we don't have direct cost on Intervention yet. 
    // In a real scenario, we would join with Parts used or Labor costs)
    // For "Realistic Data" task, we can aggregate by month and simulate cost.
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 11);
    last12Months.setDate(1);

    const monthlyInterventions = await Intervention.aggregate([
      {
        $match: {
          createdDate: { $gte: last12Months }
        }
      },
      {
        $group: {
          _id: { 
            month: { $month: '$createdDate' },
            year: { $year: '$createdDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format for chart
    const monthlyData = monthlyInterventions.map(item => ({
      name: `${item._id.month}/${item._id.year}`,
      interventions: item.count,
      cost: item.count * 150 // Simulated average cost per intervention
    }));

    res.json({
      mtbf: equipmentMetrics[0]?.avgMtbf || 0,
      mttr: equipmentMetrics[0]?.avgMttr || 0,
      byType: interventionsByType.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      byStatus: interventionsByStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      monthlyData
    });
  } catch (error) {
    console.error('Error fetching maintenance reports:', error);
    res.status(500).json({ message: 'Error fetching maintenance reports' });
  }
});

// GET /api/reports/inventory - Inventory Metrics
router.get('/inventory', async (req, res) => {
  try {
    const parts = await Part.find({});
    
    const categoryStats = {};
    let totalValue = 0;
    const lowStockItems = [];

    parts.forEach(part => {
      const value = (part.currentStock || 0) * (part.unitPrice || 0);
      totalValue += value;

      // Category stats
      if (!categoryStats[part.category]) {
        categoryStats[part.category] = { count: 0, value: 0 };
      }
      categoryStats[part.category].count++;
      categoryStats[part.category].value += value;

      // Low stock check
      if (part.currentStock <= part.minStock) {
        lowStockItems.push({
          id: part._id,
          name: part.name,
          current: part.currentStock,
          min: part.minStock,
          unitPrice: part.unitPrice
        });
      }
    });

    res.json({
      totalValue: Math.round(totalValue * 100) / 100,
      byCategory: Object.entries(categoryStats).map(([name, stats]) => ({
        name,
        count: stats.count,
        value: Math.round(stats.value * 100) / 100
      })),
      lowStockItems: lowStockItems.slice(0, 10) // Top 10 low stock items
    });
  } catch (error) {
    console.error('Error fetching inventory reports:', error);
    res.status(500).json({ message: 'Error fetching inventory reports' });
  }
});

module.exports = router;
