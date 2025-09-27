const mongoose = require('mongoose');

const ORDER_STATUS = ['pending', 'ordered', 'received', 'cancelled'];

const schema = new mongoose.Schema({
  part: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part', 
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ORDER_STATUS,
    default: 'pending'
  },
  supplier: {
    type: String,
    trim: true
  },
  unitPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  expectedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment' // Optionnel, si commande pour équipement spécifique
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Calculer le prix total automatiquement
schema.pre('save', function(next) {
  if (this.unitPrice && this.quantity) {
    this.totalPrice = this.unitPrice * this.quantity;
  }
  next();
});

// Index pour les requêtes fréquentes
schema.index({ part: 1, status: 1 });
schema.index({ orderedBy: 1 });
schema.index({ equipment: 1 });
schema.index({ orderDate: -1 });

const PartOrder = mongoose.model('PartOrder', schema);

module.exports = { PartOrder, ORDER_STATUS };