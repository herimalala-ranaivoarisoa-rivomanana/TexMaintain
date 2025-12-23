const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  partNumber: { type: String, required: true, trim: true, index: true },
  category: { type: String, required: true, trim: true },
  type: { type: String, enum: ['part', 'consumable'], default: 'part' },
  currentStock: { type: Number, default: 0 },
  minStock: { type: Number, default: 0 },
  maxStock: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  supplier: { type: String, trim: true },
  location: { type: String, trim: true },
  pendingOrders: [{
    quantity: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'ordered', 'in_transit', 'received', 'cancelled'],
      default: 'pending'
    },
    orderDate: { type: Date, default: Date.now },
    expectedDate: { type: Date },
    supplier: { type: String },
    orderNumber: { type: String },
    reference: { type: String }, // Legacy field, kept for compatibility
    references: [{ type: String }], // New field for multiple docs
    notes: { type: String }
  }],
  pendingQuantity: { type: Number, default: 0 },
  autoCalculateMinMax: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now, immutable: true },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false });

schema.pre('save', function (next) {
  this.updatedAt = Date.now();

  // Calculer la quantité totale en commande
  this.pendingQuantity = this.pendingOrders
    .filter(order => ['pending', 'ordered', 'in_transit'].includes(order.status))
    .reduce((sum, order) => sum + order.quantity, 0);

  next();
});

// === MÉTHODES D'INSTANCE ===

/**
 * Calcule le statut du stock
 * @returns {Object} { status: 'critical'|'low'|'normal'|'high', label, color }
 */
schema.methods.getStockStatus = function () {
  const stock = this.currentStock;
  const min = this.minStock;
  const max = this.maxStock;
  const pending = this.pendingQuantity;

  // Critical stock (below minimum)
  if (stock <= min * 0.5) {
    return {
      status: 'critical',
      label: 'Critical',
      color: 'red',
      icon: '🔴',
      message: `Critical stock! Only ${stock} in stock (min: ${min})`,
      needsOrder: true,
      suggestedOrderQty: Math.max(max - stock - pending, 0)
    };
  }

  // Low stock (close to minimum)
  if (stock <= min) {
    return {
      status: 'low',
      label: 'Low',
      color: 'orange',
      icon: '🟠',
      message: `Low stock. ${stock} in stock (min: ${min})`,
      needsOrder: true,
      suggestedOrderQty: Math.max(max - stock - pending, 0)
    };
  }

  // High stock (close to maximum)
  if (stock >= max * 0.9 && max > 0) {
    return {
      status: 'high',
      label: 'High',
      color: 'blue',
      icon: '🔵',
      message: `High stock. ${stock} in stock (max: ${max})`,
      needsOrder: false,
      suggestedOrderQty: 0
    };
  }

  // Normal stock
  return {
    status: 'normal',
    label: 'Normal',
    color: 'green',
    icon: '🟢',
    message: `Normal stock. ${stock} in stock`,
    needsOrder: false,
    suggestedOrderQty: 0
  };
};

/**
 * Ajoute une commande
 */
schema.methods.addOrder = function (orderData) {
  this.pendingOrders.push({
    quantity: orderData.quantity,
    status: orderData.status || 'pending',
    orderDate: orderData.orderDate || new Date(),
    expectedDate: orderData.expectedDate,
    supplier: orderData.supplier,
    orderNumber: orderData.orderNumber,
    notes: orderData.notes
  });
  return this.save();
};

/**
 * Met à jour le statut d'une commande
 */
schema.methods.updateOrderStatus = function (orderId, newStatus, options = {}) {
  const { quantity: qtyInput, reference, references } = options;
  const quantity = qtyInput !== undefined ? Number(qtyInput) : undefined;
  const order = this.pendingOrders.id(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  // Normalize references: use provided array, or single ref in array, or current order refs
  let newReferences = references || [];
  if (reference) newReferences.push(reference);

  // If no new refs provided, keep existing ones. If existing is legacy string, array-ify it.
  if (newReferences.length === 0) {
    if (order.references && order.references.length > 0) {
      newReferences = [...order.references];
    } else if (order.reference) {
      newReferences = [order.reference];
    }
  }

  // Handle Partial Update (Split)
  if (quantity && quantity < order.quantity && quantity > 0) {
    // 1. Reduce quantity of original order
    order.quantity -= quantity;

    // 2. Create new order entry for the moved quantity with new status
    this.pendingOrders.push({
      quantity: quantity,
      status: newStatus,
      orderDate: order.orderDate,
      expectedDate: order.expectedDate,
      supplier: order.supplier,
      orderNumber: order.orderNumber,
      reference: newReferences.length > 0 ? newReferences[0] : order.reference, // Legacy sync
      references: newReferences,
      notes: order.notes
        ? `${order.notes} (Split from original)`
        : `Split from original`
    });

    // If the new status is 'received', add to stock immediately
    if (newStatus === 'received') {
      this.currentStock += quantity;
    }

  } else {
    // Full Update
    order.status = newStatus;
    order.references = newReferences;
    // Sync legacy field for now
    if (newReferences.length > 0) order.reference = newReferences[0];

    // If received, add to stock
    if (newStatus === 'received') {
      this.currentStock += order.quantity;
    }
  }

  return this.save();
};

// === MÉTHODES STATIQUES ===

/**
 * Calcule et met à jour automatiquement min/max basé sur les associations
 */
schema.statics.updateMinMaxFromAssociations = async function (partId) {
  const { EquipmentPart } = require('./EquipmentPart');

  try {
    // Récupérer le calcul global de stock
    const globalStock = await EquipmentPart.calculateGlobalStock(partId);

    if (globalStock.equipmentCount === 0) {
      // Pas d'associations, garder les valeurs actuelles
      return null;
    }

    // Calculer min et max
    const minStock = globalStock.globalSafetyStock;
    const maxStock = globalStock.recommendedInitialStock;

    // Mettre à jour la pièce
    const part = await this.findByIdAndUpdate(
      partId,
      {
        minStock: Math.ceil(minStock),
        maxStock: Math.ceil(maxStock)
      },
      { new: true }
    );

    return {
      minStock: Math.ceil(minStock),
      maxStock: Math.ceil(maxStock),
      globalStock
    };
  } catch (error) {
    console.error('Error updating min/max from associations:', error);
    throw error;
  }
};

/**
 * Récupère toutes les pièces avec leur statut de stock
 */
schema.statics.getAllWithStockStatus = async function (filter = {}) {
  const parts = await this.find(filter).lean();

  return parts.map(part => {
    const partDoc = new this(part);
    const stockStatus = partDoc.getStockStatus();

    return {
      ...part,
      stockStatus
    };
  });
};

const Part = mongoose.model('Part', schema);

module.exports = { Part };



