const mongoose = require('mongoose');
const { Intervention } = require('../models/Intervention');
const EquipmentStatusService = require('./equipmentStatusService');
const { Equipment, EQUIPMENT_STATUSES } = require('../models/Equipment');
const { Mechanic } = require('../models/Mechanic');
const { Electrician } = require('../models/Electrician');
const { MaintenanceWorker } = require('../models/MaintenanceWorker');
const { Machinist } = require('../models/Machinist');

/**
 * Intervention Service
 * Handles complex intervention operations with transactions
 */
class InterventionService {
    /**
     * Start an intervention
     * Atomic operation: Updates Intervention Status -> "In Progress" AND Equipment Status -> "Under Repair"
     */
    static async startIntervention(interventionId, userId, options) {
        const { mechanicId, electricianId, maintenanceWorkerId } = options;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Get Intervention
            const intervention = await Intervention.findById(interventionId).session(session);
            if (!intervention) throw new Error('Intervention not found');
            if (intervention.status !== 'Pending') throw new Error(`Cannot start intervention in status ${intervention.status}`);

            // 2. Resolve personnel names for assignedTo (legacy string field)
            const personnelNames = [];
            if (mechanicId) {
                const p = await Mechanic.findById(mechanicId).session(session);
                if (p) personnelNames.push(p.firstName);
            }
            if (electricianId) {
                const p = await Electrician.findById(electricianId).session(session);
                if (p) personnelNames.push(p.firstName);
            }
            if (maintenanceWorkerId) {
                const p = await MaintenanceWorker.findById(maintenanceWorkerId).session(session);
                if (p) personnelNames.push(p.firstName);
            }

            // 3. Update Intervention
            intervention.status = 'In Progress';
            intervention.assignedTo = personnelNames.join(', ');
            await intervention.save({ session });

            // 4. Update Equipment Status (via Service)
            if (intervention.equipmentId) {
                // Change equipment status to UNDER_REPAIR (or similar from options if we want flexibility)
                // Usually starting an intervention implies putting equipment under maintenance
                await EquipmentStatusService.changeStatus(
                    intervention.equipmentId,
                    EQUIPMENT_STATUSES.UNDER_REPAIR, // 'under_repair'
                    userId,
                    {
                        reason: `Intervention Started: ${intervention.title}`,
                        interventionId: intervention._id,
                        mechanicId,
                        electricianId,
                        maintenanceWorkerId,
                        session
                    }
                );
            }

            await session.commitTransaction();
            return intervention;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Complete an intervention
     * Atomic operation: Updates Intervention Status -> "Completed" AND Equipment Status -> "In Production" (or other)
     */
    static async completeIntervention(interventionId, userId, options) {
        const {
            outcomeStatus = 'in_production', // Default to back in production
            machinistId,
            notes,
            cost,
            actualDuration
        } = options;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Get Intervention
            const intervention = await Intervention.findById(interventionId).session(session);
            if (!intervention) throw new Error('Intervention not found');
            if (intervention.status === 'Completed') throw new Error('Intervention already completed');

            // 2. Update Intervention
            intervention.status = 'Completed';
            intervention.completedDate = new Date();
            if (cost !== undefined) intervention.cost = cost;
            if (actualDuration !== undefined) intervention.actualDuration = actualDuration;

            await intervention.save({ session });

            // 3. Update Equipment Status
            if (intervention.equipmentId) {
                const equipment = await Equipment.findById(intervention.equipmentId).session(session);

                // Only update equipment status if it is currently in a maintenance state or breakdown
                // We don't want to accidentally toggle a machine if it was already manually moved? 
                // Actually, completing intervention usually implies handing over the machine.

                // We use changeStatus to record the handover
                await EquipmentStatusService.changeStatus(
                    intervention.equipmentId,
                    outcomeStatus,
                    userId,
                    {
                        reason: `Intervention Completed: ${intervention.title}`,
                        notes,
                        interventionId: intervention._id,
                        machinistId, // Required if going back to production
                        session
                    }
                );
            }

            await session.commitTransaction();
            return intervention;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}

module.exports = InterventionService;
