const { Asset } = require('../models/Asset');
const { AssetPart } = require('../models/AssetPart');
const { Part } = require('../models/Part');

/**
 * Asset Parts Service (works with Asset model)
 * Handles asset parts associations and calculations
 */

class AssetPartsService {
  /**
   * Recalcule automatiquement le min/max d'une pièce basé sur ses associations
   * @param {string} partId - ID de la pièce
   * @returns {Promise<object>} Nouvelles valeurs min/max
   */
  static async recalculateMinMaxForPart(partId) {
    try {
      // Utiliser la même méthode que le bouton "Calculer Min/Max"
      // pour garantir la cohérence
      const globalStock = await AssetPart.calculateGlobalStock(partId);

      if (globalStock.assetCount === 0) {
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
   * Update asset part association
   * @param {string} assetId - Asset ID (was assetId)
   * @param {string} userId - User making the change
   * @param {object} options - Additional options
   * @returns {Promise<object>} Updated asset part
   */
  static async updatedAssetPart(assetId, userId, options = {}) {
    const { partId, quantity, isStandardPart, lastReplacementDate, nextReplacementtDate, notes } = options;

    // Validate asset exists
    const asset = await Asset.findById(assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    // Update assetPart
    const updatedPart = await AssetPart.findOneAndUpdate(
      { asset: assetId, part: partId },
      {
        quantity,
        isStandardPart,
        lastReplacementDate,
        nextReplacementtDate,
        notes,
        changedBy: userId
      },
      { new: true, sort: { timestamp: -1 } }
    );

    return { assetPart: updatedPart };
  }

  /**
   * Get parts for an asset
   * @param {string} assetId - Asset ID (was assetId)
   * @param {object} options - Query options (limit, skip)
   * @returns {Promise<object>} Asset parts list
   */
  static async get(assetId, options = {}) {
    const { limit = 50, skip = 0 } = options;

    // Get asset info
    const asset = await Asset.findById(assetId)
      .populate('category')
      .populate('subCategory')
      .lean();

    if (!asset) {
      throw new Error('Asset not found');
    }

    const query = { asset: assetId };

    const assetParts = await AssetPart.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('changedBy', 'email role')
      .populate('part', 'name partNumber currentStock minStock maxStock unitPrice supplier location category type pendingOrders pendingQuantity')
      .lean();

    const total = await AssetPart.countDocuments(query);

    return {
      asset: asset, // Keep for backward compatibility
      asset, // Add asset key
      assetParts,
      total,
      page: Math.floor(skip / limit) + 1,
      limit
    };
  }
}

module.exports = AssetPartsService;