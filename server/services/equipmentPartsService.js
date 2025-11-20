const { Equipment } = require('../models/Equipment');
const { EquipmentPart} = require('../models/EquipmentPart');
const { Part } = require('../models/Part');

/**
 * Equipment Parts Service
 * Handles equipment parts associations and calculations
 */

class EquipmentPartsService {
  /**
   * Recalcule automatiquement le min/max d'une pièce basé sur ses associations
   * @param {string} partId - ID de la pièce
   * @returns {Promise<object>} Nouvelles valeurs min/max
   */
  static async recalculateMinMaxForPart(partId) {
    try {
      // Utiliser la même méthode que le bouton "Calculer Min/Max"
      // pour garantir la cohérence
      const globalStock = await EquipmentPart.calculateGlobalStock(partId);
      
      if (globalStock.equipmentCount === 0) {
        await Part.findByIdAndUpdate(partId, {
          minStock: 0,
          maxStock: 0
        });
        return { minStock: 0, maxStock: 0 };
      }
      
      // Utiliser la même formule que Part.updateMinMaxFromAssociations()
      const minStock = Math.ceil(globalStock.globalSafetyStock);
      const maxStock = Math.ceil(globalStock.globalReorderPoint);
      
      // Mettre à jour la pièce
      await Part.findByIdAndUpdate(partId, {
        minStock: minStock,
        maxStock: maxStock
      });
      
      return { minStock, maxStock };
    } catch (error) {
      console.error('Error recalculating min/max:', error);
      throw error;
    }
  }
  /**
   * Change equipment status with validation and history tracking
   * @param {string} equipmentId - Equipment ID
   * @param {string} userId - User making the change
   * @param {object} options - Additional options (reason, notes, interventionId, machinistId, metadata)
   * @returns {Promise<object>} Updated equipment and history entry
   */
  static async updatedEquipmentPart(equipmentId, userId, options = {}) {
    const { partId, quantity, isStandardPart, lastReplacementDate, nextReplacementtDate, notes} = options;
    // Validate equipment exists
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      throw new Error('Equipment not found');
    }

    // Update equipmentPart
    await EquipmentPart.findOneAndUpdate(
      { equipment: equipmentId, part:partId, quantity, isStandardPart, lastReplacementDate, nextReplacementtDate, notes, changedBy:userId},
      { sort: { timestamp: -1 } }
    );

    return {EquipmentPart}
    

    // Create Equipment part
    const Part = await EquipmentPart.create({
      equipment: equipmentId,
      part:partId,
      changedBy: userId,
      isStandardPart,
      lastReplacementDate,
      nextReplacementtDate,
      notes,
      timestamp: new Date()
    });

    // Update equipment status
    equipment.status = newStatus;
    equipment.lastStatusChange = new Date();
    equipment.lastStatusChangedBy = userId;
    equipment.currentStatusDuration = 0;
    await equipment.save();

    // Populate the history entry
    await historyEntry.populate('changedBy', 'email role');
    await historyEntry.populate('part', 'name partNunber currentStock minStock, naxStock, unitPrice');

    // Return updated equipment with populated fields
    const updatedEquipment = await Equipment.findById(equipmentId)
      .populate('category')
      .populate('type')
      .populate('part', 'name partNunber currentStock minStock, naxStock, unitPrice');

    return {
      equipment: updatedEquipment,
      historyEntry
    };
  }

  /**
   * Get parts for an equipment
   * @param {string} equipmentId - Equipment ID
   * @param {object} options - Query options (limit, skip, startDate, endDate)
   * @returns {Promise<Array>} Status history entries
   */
  static async get(equipmentId, options = {}) {
    const { limit = 50, skip = 0 } = options;

    // Get equipment info
    const equipment = await Equipment.findById(equipmentId)
      .populate('category')
      .populate('type')
      .lean();

    if (!equipment) {
      throw new Error('Equipment not found');
    }

    const query = { equipment: equipmentId };

    const equipmentParts = await EquipmentPart.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('changedBy', 'email role')
      .populate('part', 'name partNumber currentStock minStock maxStock unitPrice supplier location category type pendingOrders pendingQuantity')
      .lean();

    const total = await EquipmentPart.countDocuments(query);

    return {
      equipment,
      equipmentParts,
      total,
      page: Math.floor(skip / limit) + 1,
      limit
    };
  }
}

module.exports = EquipmentPartsService;