const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Asset } = require('../models/Asset');
const { Intervention } = require('../models/Intervention');
const { Part } = require('../models/Part');

// Helper to calculate stock status (duplicating logic from Part model for aggregation if needed, 
// but for simple counts we can fetch and filter or use aggregation)

// GET /api/reports/stats - General Dashboard Stats
router.get('/stats', async (req, res) => {
  try {
    // KPI Logic Alignment with Dashboard
    // Dashboard: activeInterventions = status in ['Pending', 'In Progress']
    // Dashboard: criticalParts = $lte: ['$currentStock', '$minStock']

    const factoryFilter = req.activeFactoryId ? { factory: new mongoose.Types.ObjectId(req.activeFactoryId) } : {};

    const [
      assetCount,
      activeInterventions,
      lowStockPartsCount,
      parts,
      assetFinancials
    ] = await Promise.all([
      Asset.countDocuments(factoryFilter),
      Intervention.countDocuments({ ...factoryFilter, status: { $in: ['Pending', 'In Progress'] } }),
      Part.countDocuments({ ...factoryFilter, $expr: { $lte: ['$currentStock', '$minStock'] } }),
      Part.find(factoryFilter, 'currentStock unitPrice'), // Just needed for value calculation now
      Asset.aggregate([
        { $match: factoryFilter },
        {
          $group: {
            _id: null,
            totalTCO: { $sum: '$tco' },
            totalAssetValue: { $sum: '$purchasePrice' }
          }
        }
      ])
    ]);

    let totalStockValue = 0;
    parts.forEach(part => {
      totalStockValue += (part.currentStock || 0) * (part.unitPrice || 0);
    });

    res.json({
      assetCount,
      activeInterventions,

      lowStockParts: lowStockPartsCount, // Using the DB count for consistency
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      totalTCO: assetFinancials[0]?.totalTCO || 0,
      totalAssetValue: assetFinancials[0]?.totalAssetValue || 0
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({ message: 'Error fetching report stats' });
  }
});

// GET /api/reports/maintenance - Maintenance Metrics
router.get('/maintenance', async (req, res) => {
  try {
    // Calculate averages for MTBF and MTTR from Asset
    const factoryFilter = req.activeFactoryId ? { factory: new mongoose.Types.ObjectId(req.activeFactoryId) } : {};

    // Calculate averages for MTBF and MTTR from Asset
    const assetMetrics = await Asset.aggregate([
      { $match: factoryFilter },
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
      { $match: factoryFilter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Group interventions by status
    const interventionsByStatus = await Intervention.aggregate([
      { $match: factoryFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly intervention costs and count
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 11);
    last12Months.setDate(1);

    const monthlyInterventions = await Intervention.aggregate([
      {
        $match: {
          ...factoryFilter,
          createdDate: { $gte: last12Months }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$createdDate' },
            year: { $year: '$createdDate' }
          },
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' } // Actual cost aggregation
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format for chart
    const monthlyData = monthlyInterventions.map(item => ({
      name: `${item._id.month}/${item._id.year}`,
      interventions: item.count,
      cost: item.totalCost || 0
    }));

    res.json({
      mtbf: assetMetrics[0]?.avgMtbf || 0,
      mttr: assetMetrics[0]?.avgMttr || 0,
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
    const factoryFilter = req.activeFactoryId ? { factory: new mongoose.Types.ObjectId(req.activeFactoryId) } : {};
    const parts = await Part.find(factoryFilter);

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

// GET /api/reports/financials - Financial Health Metrics
router.get('/financials', async (req, res) => {
  try {
    const factoryFilter = req.activeFactoryId ? { factory: new mongoose.Types.ObjectId(req.activeFactoryId) } : {};

    // Top 5 costliest asset by TCO
    const topCostlyAsset = await Asset.find({ ...factoryFilter, tco: { $gt: 0 } })
      .sort({ tco: -1 })
      .limit(5)
      .select('name tco purchasePrice totalMaintenanceCost')
      .lean();

    // Aggregate TCO by Category
    const tcoByCategory = await Asset.aggregate([
      { $match: factoryFilter },
      {
        $lookup: {
          from: 'assetcategories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$categoryInfo.name',
          totalTCO: { $sum: '$tco' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalTCO: -1 } }
    ]);

    res.json({
      topCostlyAsset,
      tcoByCategory: tcoByCategory.map(c => ({
        name: c._id,
        value: c.totalTCO
      }))
    });

  } catch (error) {
    console.error('Error fetching financial reports:', error);
    res.status(500).json({ message: 'Error fetching financial reports' });
  }
});

module.exports = router;
