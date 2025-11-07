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
    notes: { type: String }
  }],
  pendingQuantity: { type: Number, default: 0 },
  autoCalculateMinMax: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now, immutable: true },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false });

schema.pre('save', function(next) {
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
schema.methods.getStockStatus = function() {
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
schema.methods.addOrder = function(orderData) {
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
schema.methods.updateOrderStatus = function(orderId, newStatus) {
  const order = this.pendingOrders.id(orderId);
  if (order) {
    order.status = newStatus;
    
    // Si reçue, ajouter au stock
    if (newStatus === 'received') {
      this.currentStock += order.quantity;
    }
    
    return this.save();
  }
  throw new Error('Order not found');
};

// === MÉTHODES STATIQUES ===

/**
 * Calcule et met à jour automatiquement min/max basé sur les associations
 */
schema.statics.updateMinMaxFromAssociations = async function(partId) {
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
schema.statics.getAllWithStockStatus = async function(filter = {}) {
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



