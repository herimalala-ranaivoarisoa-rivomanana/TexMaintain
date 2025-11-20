# 📊 Stock Levels Clarification

**Date**: November 2, 2025  
**Issue**: Confusion between minStock, maxStock, safetyStock, and reorderPoint

---

## 🎯 Current System Logic

### Backend Calculations (EquipmentPart.js)

```javascript
// For each equipment-part association:
safetyStock = dailyConsumption × leadTimeDays × safetyCoefficient
reorderPoint = safetyStock + (dailyConsumption × leadTimeDays)

// Global calculations (all associations combined):
globalSafetyStock = totalDailyConsumption × maxLeadTime × maxSafetyCoeff
globalReorderPoint = globalSafetyStock + (totalDailyConsumption × maxLeadTime)
```

### Part Min/Max Update

```javascript
// When calculating Min/Max for a part:
minStock = globalSafetyStock  // ← Safety stock becomes minimum
maxStock = globalReorderPoint  // ← Reorder point becomes maximum
```

---

## ❌ The Confusion

### Current Status Logic (equipmentPartsRoutes.js line 149-150)

```javascript
status: part.currentStock <= globalStock.globalSafetyStock ? 'critical' :
        part.currentStock <= globalStock.globalReorderPoint ? 'warning' : 'ok'
```

**Translation:**
- `currentStock ≤ globalSafetyStock` (= minStock) → **Critical**
- `currentStock ≤ globalReorderPoint` (= maxStock) → **Warning**
- `currentStock > globalReorderPoint` → **OK**

### The Problem

1. **Terminology Mismatch**:
   - We call it "Reorder point" in the UI
   - But we use it as "maxStock" in the logic
   - The status "warning" means "below reorder point" but actually means "below maxStock"

2. **Conceptual Issue**:
   - Normally, "reorder point" is the level at which you should order more
   - But here, being ABOVE the "reorder point" means you're OK
   - This is backwards from standard inventory management

---

## ✅ Standard Inventory Management

### Standard Definitions

```
Safety Stock: Minimum buffer to avoid stockouts
Reorder Point: Level at which to trigger a new order
Maximum Stock: Target stock level after receiving an order

Typical relationship:
Safety Stock < Reorder Point < Maximum Stock
```

### Standard Status Logic

```
Critical: stock ≤ Safety Stock
Warning: stock ≤ Reorder Point (but > Safety Stock)
OK: stock > Reorder Point
```

---

## 🔧 Current TexMaintain System

### Actual Mapping

| TexMaintain Term | Standard Term | Value | Used As |
|------------------|---------------|-------|---------|
| globalSafetyStock | Safety Stock | Calculated | minStock |
| globalReorderPoint | Maximum Stock | Calculated | maxStock |
| minStock | Safety Stock | From globalSafetyStock | Minimum level |
| maxStock | Target Stock | From globalReorderPoint | Maximum level |

### Status Logic (Current)

```
Critical: stock ≤ minStock (safety stock) ✅ Correct
Warning: stock ≤ maxStock (called "reorder point") ⚠️ Confusing
OK: stock > maxStock ✅ Correct
```

---

## 💡 Recommendations

### Option 1: Keep Current Logic, Fix Labels

**Change UI labels to match actual logic:**

```javascript
// In GlobalStockCard.tsx
"Safety stock" → "Minimum stock"
"Reorder point" → "Maximum stock"
"Recommended initial stock" → "Target stock"
```

**Status messages:**
```
Critical: "Stock is below minimum level"
Warning: "Stock is below maximum level"
OK: "Stock is at target level"
```

### Option 2: Implement True Reorder Point

**Add a real reorder point between min and max:**

```javascript
minStock = globalSafetyStock  // Safety stock
reorderPoint = globalSafetyStock + (totalDailyConsumption × avgLeadTime)  // Reorder point
maxStock = globalReorderPoint  // Maximum stock
```

**Status logic:**
```
Critical: stock ≤ minStock
Warning: stock ≤ reorderPoint (but > minStock)
OK: stock > reorderPoint
```

---

## 🎯 Recommended Solution: Option 1

**Keep the current logic but clarify the labels:**

### Backend (No changes needed)
```javascript
// Status logic is correct
status: currentStock <= globalSafetyStock ? 'critical' :
        currentStock <= globalReorderPoint ? 'warning' : 'ok'
```

### Frontend Changes

#### GlobalStockCard.tsx - Section "Calculated stocks"
```javascript
// BEFORE
"Safety stock" → globalSafetyStock
"Reorder point" → globalReorderPoint
"Recommended initial stock" → recommendedInitialStock

// AFTER
"Minimum stock (Safety)" → globalSafetyStock
"Maximum stock (Target)" → globalReorderPoint
"Recommended initial stock" → recommendedInitialStock
```

#### GlobalStockCard.tsx - Status section
```javascript
// BEFORE
"Current stock" vs "Reorder point"

// AFTER
"Current stock" vs "Maximum stock"
```

#### Status Messages
```javascript
// BEFORE
warning: 'Stock is below reorder point'
critical: 'Stock is below safety level'

// AFTER
warning: 'Stock is below maximum level'
critical: 'Stock is below minimum level'
```

---

## 📝 Summary

**The confusion comes from:**
1. Calling `globalReorderPoint` a "reorder point" when it's actually used as `maxStock`
2. The status "warning" means "below max" not "below reorder point"

**The fix:**
- Rename "Reorder point" → "Maximum stock" in the UI
- Update status messages to reflect actual logic
- Keep backend logic unchanged (it's correct)

---

**Document created on November 2, 2025**  
**Stock Levels Clarification**
