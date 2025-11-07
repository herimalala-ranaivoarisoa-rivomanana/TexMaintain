import api from './api'

// === TYPES ===

export type Criticality = 'low' | 'medium' | 'high' | 'critical'

export interface EquipmentPart {
  _id: string
  equipment: {
    _id: string
    model: string
    serialNumber: string
    location: string
    status: string
  }
  part: {
    _id: string
    name: string
    partNumber: string
    category: string
    type: 'part' | 'consumable'
    currentStock: number
    minStock: number
    maxStock: number
    unitPrice?: number
    supplier?: string
  }
  
  // Paramètres de consommation
  quantityPerMachine: number
  replacementFrequencyPerYear: number
  
  // Criticité et importance
  criticality: Criticality
  criticalityScore: number
  machineImportance: number
  
  // Délais
  leadTimeDays: number
  safetyCoefficient: number
  
  // Calculs automatiques
  annualConsumption: number
  dailyConsumption: number
  safetyStock: number
  reorderPoint: number
  
  // Historique
  isStandardPart: boolean
  lastReplacementDate?: string
  nextReplacementDate?: string
  replacementHistory: ReplacementHistoryEntry[]
  
  notes?: string
  changedBy: {
    _id: string
    fullName: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

export interface ReplacementHistoryEntry {
  date: string
  quantityUsed: number
  performedBy: {
    _id: string
    fullName: string
    email: string
  }
  notes?: string
}

export interface CreateEquipmentPartData {
  equipment: string
  part: string
  quantityPerMachine: number
  replacementFrequencyPerYear: number
  criticality: Criticality
  machineImportance: number
  leadTimeDays?: number
  safetyCoefficient?: number
  isStandardPart?: boolean
  notes?: string
}

export interface UpdateEquipmentPartData {
  quantityPerMachine?: number
  replacementFrequencyPerYear?: number
  criticality?: Criticality
  machineImportance?: number
  leadTimeDays?: number
  safetyCoefficient?: number
  isStandardPart?: boolean
  notes?: string
}

export interface GlobalStockCalculation {
  totalAnnualConsumption: number
  totalDailyConsumption: number
  weightedCriticality: number
  weightedCriticalityLabel: Criticality
  globalSafetyStock: number
  globalReorderPoint: number
  recommendedInitialStock: number
  equipmentCount: number
  details: {
    equipment: {
      _id: string
      model: string
      serialNumber: string
    }
    quantityPerMachine: number
    replacementFrequencyPerYear: number
    annualConsumption: number
    criticality: Criticality
    machineImportance: number
  }[]
}

export interface GlobalStockResponse {
  success: boolean
  part: {
    _id: string
    name: string
    partNumber: string
    currentStock: number
  }
  globalStock: GlobalStockCalculation
  status: 'ok' | 'warning' | 'critical'
}

export interface ReorderAlert {
  part: {
    _id: string
    name: string
    partNumber: string
    currentStock: number
  }
  currentStock: number
  reorderPoint: number
  safetyStock: number
  deficit: number
  urgency: 'critical' | 'warning'
  equipmentCount: number
}

export interface ConsumptionStats {
  annual: number
  monthly: number
  weekly: number
  daily: number
  safetyStock: number
  reorderPoint: number
}

// === API FUNCTIONS ===

/**
 * Liste toutes les associations équipement-pièce
 */
export const getEquipmentParts = async (params?: {
  equipment?: string
  part?: string
  criticality?: Criticality
  page?: number
  limit?: number
}) => {
  const response = await api.get('/api/equipment-parts', { params })
  return response.data
}

/**
 * Liste toutes les pièces associées à un équipement
 */
export const getEquipmentPartsByEquipment = async (equipmentId: string) => {
  const response = await api.get(`/api/equipment-parts/equipment/${equipmentId}`)
  return response.data
}

/**
 * Liste tous les équipements utilisant une pièce
 */
export const getEquipmentPartsByPart = async (partId: string) => {
  const response = await api.get(`/api/equipment-parts/part/${partId}`)
  return response.data
}

/**
 * Calcule le stock global nécessaire pour une pièce
 */
export const calculateGlobalStock = async (partId: string): Promise<GlobalStockResponse> => {
  const response = await api.get(`/api/equipment-parts/part/${partId}/global-stock`)
  return response.data
}

/**
 * Obtient les alertes de réapprovisionnement
 */
export const getReorderAlerts = async () => {
  const response = await api.get('/api/equipment-parts/reorder-alerts')
  return response.data
}

/**
 * Obtient les détails d'une association
 */
export const getEquipmentPart = async (id: string) => {
  const response = await api.get(`/api/equipment-parts/${id}`)
  return response.data
}

/**
 * Crée une nouvelle association équipement-pièce
 */
export const createEquipmentPart = async (data: CreateEquipmentPartData) => {
  const response = await api.post('/api/equipment-parts', data)
  return response.data
}

/**
 * Modifie une association
 */
export const updateEquipmentPart = async (id: string, data: UpdateEquipmentPartData) => {
  const response = await api.patch(`/api/equipment-parts/${id}`, data)
  return response.data
}

/**
 * Supprime une association
 */
export const deleteEquipmentPart = async (id: string) => {
  const response = await api.delete(`/api/equipment-parts/${id}`)
  return response.data
}

/**
 * Enregistre un remplacement de pièce (pour parts)
 */
export const recordReplacement = async (id: string, data: { quantity: number; notes?: string }) => {
  const response = await api.post(`/api/equipment-parts/${id}/record-replacement`, data)
  return response.data
}

/**
 * Enregistre une utilisation de consommable (pour consumables)
 */
export const recordUsage = async (id: string, data: { quantity: number; notes?: string }) => {
  const response = await api.post(`/api/equipment-parts/${id}/record-usage`, data)
  return response.data
}

// === HELPER FUNCTIONS ===

/**
 * Retourne le label de criticité
 */
export const getCriticalityLabel = (criticality: Criticality): string => {
  const labels: Record<Criticality, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
  }
  return labels[criticality]
}

/**
 * Retourne la couleur de criticité
 */
export const getCriticalityColor = (criticality: Criticality): string => {
  const colors: Record<Criticality, string> = {
    low: 'text-blue-600 bg-blue-50',
    medium: 'text-yellow-600 bg-yellow-50',
    high: 'text-orange-600 bg-orange-50',
    critical: 'text-red-600 bg-red-50'
  }
  return colors[criticality]
}

/**
 * Retourne l'icône de criticité
 */
export const getCriticalityIcon = (criticality: Criticality): string => {
  const icons: Record<Criticality, string> = {
    low: '🔵',
    medium: '🟡',
    high: '🟠',
    critical: '🔴'
  }
  return icons[criticality]
}

/**
 * Retourne le label de statut de stock
 */
export const getStockStatusLabel = (status: 'ok' | 'warning' | 'critical'): string => {
  const labels = {
    ok: 'Stock OK',
    warning: 'Attention',
    critical: 'Critique'
  }
  return labels[status]
}

/**
 * Retourne la couleur de statut de stock
 */
export const getStockStatusColor = (status: 'ok' | 'warning' | 'critical'): string => {
  const colors = {
    ok: 'text-green-600 bg-green-50',
    warning: 'text-orange-600 bg-orange-50',
    critical: 'text-red-600 bg-red-50'
  }
  return colors[status]
}

/**
 * Formate une fréquence de remplacement
 */
export const formatReplacementFrequency = (frequency: number): string => {
  if (frequency === 0) return 'Never'
  if (frequency === 1) return '1 time/year'
  if (frequency < 1) {
    const years = Math.round(1 / frequency)
    return `Every ${years} years`
  }
  if (frequency === Math.floor(frequency)) {
    return `${frequency} times/year`
  }
  const months = Math.round(12 / frequency)
  return `Every ${months} months`
}

/**
 * Formate une consommation
 */
export const formatConsumption = (value: number, unit: string = 'pieces'): string => {
  if (value === 0) return `0 ${unit}`
  if (value < 0.01) return `< 0.01 ${unit}`
  if (value < 1) return `${value.toFixed(2)} ${unit}`
  if (value === Math.floor(value)) return `${value} ${unit}`
  return `${value.toFixed(1)} ${unit}`
}

/**
 * Calcule le nombre de jours jusqu'au prochain remplacement
 */
export const getDaysUntilReplacement = (nextReplacementDate?: string): number | null => {
  if (!nextReplacementDate) return null
  const now = new Date()
  const next = new Date(nextReplacementDate)
  const diff = next.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Vérifie si un remplacement est en retard
 */
export const isReplacementOverdue = (nextReplacementDate?: string): boolean => {
  if (!nextReplacementDate) return false
  const days = getDaysUntilReplacement(nextReplacementDate)
  return days !== null && days < 0
}

/**
 * Vérifie si un remplacement est bientôt dû
 */
export const isReplacementDueSoon = (nextReplacementDate?: string, daysThreshold: number = 7): boolean => {
  if (!nextReplacementDate) return false
  const days = getDaysUntilReplacement(nextReplacementDate)
  return days !== null && days >= 0 && days <= daysThreshold
}
