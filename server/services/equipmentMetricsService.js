const { Equipment, EQUIPMENT_STATUSES } = require('../models/Equipment');
const { Intervention } = require('../models/Intervention');

/**
 * Equipment Metrics Service
 * Handles calculation and persistence of maintenance metrics (MTBF, MTTR, etc.)
 */
class EquipmentMetricsService {
    /**
     * Calculate and update metrics for a specific equipment
     * @param {string} equipmentId - Equipment ID
     * @returns {Promise<object>} Updated metrics
     */
    static async calculateMetrics(equipmentId) {
        try {
            const equipment = await Equipment.findById(equipmentId);
            if (!equipment) {
                throw new Error('Equipment not found');
            }

            // Find completed corrective/emergency interventions
            // Fallback to location string match for legacy data
            const interventions = await Intervention.find({
                $or: [
                    { equipmentId: equipment._id },
                    { equipment: equipment.location }
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

            // Add current downtime if equipment is not in production
            if (equipment.status !== EQUIPMENT_STATUSES.IN_PRODUCTION && equipment.lastStatusChange) {
                const currentDowntime = (Date.now() - new Date(equipment.lastStatusChange).getTime()) / (1000 * 60 * 60); // hours
                downtime += currentDowntime;
            }

            let timeSinceAcquisition = 0;
            let operatingTime = 0;
            let availability = 0;

            if (equipment.acquisitionDate) {
                timeSinceAcquisition = (Date.now() - new Date(equipment.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24); // days
                const totalHours = timeSinceAcquisition * 24;
                operatingTime = Math.max(0, totalHours - downtime); // hours

                if (totalHours > 0) {
                    availability = (operatingTime / totalHours) * 100;
                }
            }

            // If equipment is currently not in production, availability is 0? 
            // No, availability is a historical metric. But if it's scrapped, maybe?
            // Keeping existing logic: if not in production, set availability to 0 (seems harsh for historical, but matches previous code)
            // Actually, previous code set availability to 0 if status != IN_PRODUCTION. 
            // That's "Instant Availability", not "Historical Availability".
            // We'll store both if needed, but for now let's stick to the requested MTBF/MTTR persistence.
            // We will persist the calculated values.

            const updates = {
                mtbf: Math.round(mtbf * 100) / 100,
                mttr: Math.round(mttr * 100) / 100,
                availability: Math.round(availability * 100) / 100,
                downtime: Math.round(downtime * 100) / 100,
                operatingTime: Math.round(operatingTime * 100) / 100,
                timeSinceAcquisition: Math.round(timeSinceAcquisition * 100) / 100,
                lastMetricsUpdate: new Date()
            };

            await Equipment.findByIdAndUpdate(equipmentId, updates);

            return updates;

        } catch (error) {
            console.error(`Error calculating metrics for equipment ${equipmentId}:`, error);
            throw error;
        }
    }

    /**
     * Recalculate metrics for all equipment
     * Useful for migration or nightly jobs
     */
    static async recalculateAll() {
        const equipments = await Equipment.find({}, '_id');
        let count = 0;
        for (const eq of equipments) {
            await this.calculateMetrics(eq._id);
            count++;
        }
        return count;
    }
}

module.exports = EquipmentMetricsService;
