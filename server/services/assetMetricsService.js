const { Asset, ASSET_STATUSES } = require('../models/Asset');
const { Intervention } = require('../models/Intervention');

/**
 * Asset Metrics Service
 * Handles calculation and persistence of maintenance metrics (MTBF, MTTR, etc.)
 */
class AssetMetricsService {
    /**
     * Calculate and update metrics for a specific asset
     * @param {string} assetId - Asset ID
     * @returns {Promise<object>} Updated metrics
     */
    static async calculateMetrics(assetId) {
        try {
            const asset = await Asset.findById(assetId);
            if (!asset) {
                throw new Error('Asset not found');
            }

            // Find completed corrective/emergency interventions
            // Fallback to location string match for legacy data
            const interventions = await Intervention.find({
                $or: [
                    { assetId: asset._id },
                    { asset: asset.location }
                ],
                type: { $in: ['Corrective', 'Emergency'] },
                status: 'Completed'
            }).sort({ createdDate: 1 }).lean();

            let mtbf = 0;
            let mttr = 0;
            let totalRepairTime = 0;

            // Calculate MTBF (Mean Time Between Failures)
            if (interventions.length > 1) {
                const intervals = [];
                for (let i = 1; i < interventions.length; i++) {
                    const interval = (new Date(interventions[i].createdDate) - new Date(interventions[i - 1].createdDate)) / (1000 * 60 * 60); // hours
                    intervals.push(interval);
                }
                if (intervals.length > 0) {
                    mtbf = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                }
            }

            // Calculate MTTR (Mean Time To Repair)
            if (interventions.length > 0) {
                const durations = interventions
                    .filter(i => i.dueDate) // Using dueDate as proxy for completion if actualDuration not set? 
                    // Better logic: use actualDuration if available, else (completedDate - createdDate), else (dueDate - createdDate)
                    .map(i => {
                        if (i.actualDuration) return i.actualDuration;
                        if (i.completedDate) return (new Date(i.completedDate) - new Date(i.createdDate)) / (1000 * 60 * 60);
                        return (new Date(i.dueDate) - new Date(i.createdDate)) / (1000 * 60 * 60);
                    });

                if (durations.length > 0) {
                    totalRepairTime = durations.reduce((a, b) => a + b, 0);
                    mttr = totalRepairTime / durations.length;
                }
            }

            // Calculate Availability
            // Availability = (Operating Time / Planned Production Time) * 100
            // Simplified: (Total Time - Downtime) / Total Time

            let downtime = totalRepairTime;

            // Add current downtime if asset is not in production
            if (asset.status !== ASSET_STATUSES.IN_PRODUCTION && asset.lastStatusChange) {
                const currentDowntime = (Date.now() - new Date(asset.lastStatusChange).getTime()) / (1000 * 60 * 60); // hours
                downtime += currentDowntime;
            }

            let timeSinceAcquisition = 0;
            let operatingTime = 0;
            let availability = 0;

            if (asset.acquisitionDate) {
                timeSinceAcquisition = (Date.now() - new Date(asset.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24); // days
                const totalHours = timeSinceAcquisition * 24;
                operatingTime = Math.max(0, totalHours - downtime); // hours

                if (totalHours > 0) {
                    availability = (operatingTime / totalHours) * 100;
                }
            }

            // If asset is currently not in production, availability is 0? 
            // No, availability is a historical metric. But if it's scrapped, maybe?
            // Keeping existing logic: if not in production, set availability to 0 (seems harsh for historical, but matches previous code)
            // Actually, previous code set availability to 0 if status != IN_PRODUCTION. 
            // That's "Instant Availability", not "Historical Availability".
            // We'll store both if needed, but for now let's stick to the requested MTBF/MTTR persistence.
            // We will persist the calculated values.

            // === FINANCIAL METRICS CALCULATION ===

            // 1. Calculate Total Maintenance Cost from Interventions
            // Assuming 'cost' field on Intervention model is populated.
            // If we don't have cost on interventions yet, we might use the simulated logic (count * 150) temporarily 
            // OR strictly sum the '21: cost: { type: Number, default: 0 }' if users have entered it.
            // For this implementation, we will sum the actual cost field to be data-driven.

            const allInterventions = await Intervention.find({
                assetId: asset._id,
                status: 'Completed'
            }, 'cost').lean();

            const totalMaintenanceCost = allInterventions.reduce((sum, inv) => sum + (inv.cost || 0), 0);

            // 2. Calculate Depreciation and Current Value (Straight-Line Method)
            let currentValue = 0;
            const purchasePrice = asset.purchasePrice || 0;
            const usefulLifeYears = asset.usefulLifeYears || 10;
            const salvageValue = asset.salvageValue || 0;

            if (purchasePrice > 0 && asset.acquisitionDate) {
                const ageInYears = timeSinceAcquisition / 365;

                // Depreciation per year = (Cost - Salvage) / Useful Life
                const depreciableAmount = purchasePrice - salvageValue;
                const annualDepreciation = depreciableAmount / usefulLifeYears;
                const totalDepreciation = annualDepreciation * ageInYears;

                // Current Value = Purchase Price - Total Depreciation (min is Salvage Value)
                currentValue = Math.max(salvageValue, purchasePrice - totalDepreciation);
            }

            // 3. Calculate TCO (Total Cost of Ownership)
            // TCO = Purchase Price + Maintenance Costs + (Operating Costs - not modelled yet)
            const tco = purchasePrice + totalMaintenanceCost;

            const updates = {
                mtbf: Math.round(mtbf * 100) / 100,
                mttr: Math.round(mttr * 100) / 100,
                availability: Math.round(availability * 100) / 100,
                downtime: Math.round(downtime * 100) / 100,
                operatingTime: Math.round(operatingTime * 100) / 100,
                timeSinceAcquisition: Math.round(timeSinceAcquisition * 100) / 100,

                // Financial updates
                currentValue: Math.round(currentValue * 100) / 100,
                totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
                tco: Math.round(tco * 100) / 100,

                lastMetricsUpdate: new Date()
            };

            await Asset.findByIdAndUpdate(assetId, updates);

            return updates;

        } catch (error) {
            console.error(`Error calculating metrics for asset ${assetId}:`, error);
            throw error;
        }
    }

    /**
     * Recalculate metrics for all asset
     * Useful for migration or nightly jobs
     */
    static async recalculateAll() {
        const assets = await Asset.find({}, '_id');
        let count = 0;
        for (const eq of assets) {
            await this.calculateMetrics(eq._id);
            count++;
        }
        return count;
    }
}

module.exports = AssetMetricsService;
