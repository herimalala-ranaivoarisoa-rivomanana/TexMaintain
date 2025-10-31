# Inventory Module - Testing Guide

## Overview
The inventory module has been updated with all French text translated to English. This guide helps verify the functionality.

## Changes Made

### Frontend (client/src/pages/Inventory.tsx)
All French text has been translated to English:

1. **Pagination Controls**
   - "résultats" → "results"
   - "Précédent" → "Previous"
   - "Suivant" → "Next"

2. **Statistics Cards**
   - "Total Pièces/Consommables/Articles" → "Total Parts/Consumables/Items"
   - "Stock Critique" → "Critical Stock"
   - "Valeur Totale" → "Total Value"
   - "Valeur Moyenne" → "Average Value"

3. **Tabs**
   - "Tous" → "All"
   - "Pièces de Rechange" → "Spare Parts"
   - "Consommables" → "Consumables"

4. **Empty State Messages**
   - "Aucun pièce de rechange/consommable/article trouvé" → "No spare parts/consumables/items found"
   - "Essayez d'ajuster vos critères de recherche ou filtre" → "Try adjusting your search or filter criteria"

5. **Comments**
   - "Statistiques" → "Statistics"
   - "Message si aucun élément" → "Message if no items"
   - "Onglets Pièces / Consommables" → "Parts / Consumables Tabs"

## API Endpoints Verification

### Backend Routes (server/routes/inventoryRoutes.js)

All endpoints are properly configured:

1. **GET /api/inventory**
   - Retrieves inventory with pagination, filtering, and sorting
   - Supports parameters: `page`, `limit`, `category`, `q` (search), `sort`, `order`, `type`
   - Returns: parts list, statistics, filtered totals

2. **GET /api/inventory/:id**
   - Retrieves a single part by ID
   - Returns: part details

3. **PUT /api/inventory/:id/stock**
   - Updates stock levels
   - Requires: `quantity`, `type` ('in' or 'out'), `reason`
   - Permissions: admin, maintenance_manager, procurement_manager, assistant_maintenance_manager, foreman

4. **POST /api/inventory**
   - Creates a new part
   - Requires: `name`, `partNumber`, `category`
   - Optional: `type`, `currentStock`, `minStock`, `maxStock`, `unitPrice`, `supplier`, `location`
   - Permissions: admin only
   - Validation: Zod schema

5. **PATCH /api/inventory/:id**
   - Updates part details
   - Permissions: admin, procurement_manager

6. **DELETE /api/inventory/:id**
   - Deletes a part
   - Permissions: admin only

## Testing Checklist

### 1. Start the Application

```bash
# Start MongoDB
npm run db:up

# Start backend (in server directory)
cd server
npm run dev

# Start frontend (in client directory)
cd client
npm run dev
```

### 2. Manual Testing Steps

#### A. View Inventory
- [ ] Navigate to `/inventory`
- [ ] Verify all text is in English
- [ ] Check that the three tabs display: "All", "Spare Parts", "Consumables"
- [ ] Verify statistics cards show: "Total Parts/Consumables/Items", "Critical Stock", "Total Value", "Average Value"

#### B. Filtering & Search
- [ ] Test search functionality with part names
- [ ] Filter by category
- [ ] Sort by different fields (name, partNumber, currentStock, updatedAt)
- [ ] Change sort order (asc/desc)
- [ ] Change items per page (6, 12, 24, 48)

#### C. Pagination
- [ ] Navigate between pages using "Previous" and "Next" buttons
- [ ] Use "«" and "»" buttons to jump to first/last page
- [ ] Verify "results • Page X / Y" displays correctly in English

#### D. Stock Management (requires appropriate role)
- [ ] Click "Update Stock" on a part
- [ ] Select "Stock In" or "Stock Out"
- [ ] Enter quantity and reason
- [ ] Verify stock updates correctly

#### E. CRUD Operations (requires admin/procurement_manager role)
- [ ] Click "Add Part" or "Add Consumable"
- [ ] Fill in all fields
- [ ] Create a new part/consumable
- [ ] Edit an existing part
- [ ] Delete a part (admin only)

#### F. Export Functionality
- [ ] Click "Export CSV"
- [ ] Verify CSV file downloads with correct data

### 3. API Testing with Postman/Insomnia

Import the collection: `TexMaintain.postman_collection.json`

Test each endpoint:
- [ ] GET /api/inventory (with various filters)
- [ ] GET /api/inventory/:id
- [ ] PUT /api/inventory/:id/stock
- [ ] POST /api/inventory
- [ ] PATCH /api/inventory/:id
- [ ] DELETE /api/inventory/:id

### 4. Edge Cases

- [ ] Empty inventory (no items found message in English)
- [ ] Critical stock items (red badge)
- [ ] Low stock items (yellow badge)
- [ ] Normal stock items (green badge)
- [ ] Very long part names
- [ ] Special characters in search
- [ ] Invalid stock updates (negative quantities)

### 5. Responsive Design

- [ ] Test on mobile viewport
- [ ] Test on tablet viewport
- [ ] Test on desktop viewport
- [ ] Verify grid layout adapts correctly

## Expected Behavior

### Statistics
- **Total Parts/Consumables/Items**: Shows count of filtered items
- **Critical Stock**: Items where currentStock ≤ minStock
- **Total Value**: Sum of (currentStock × unitPrice) for filtered items
- **Average Value**: Total Value / Number of items

### Stock Status
- **Critical**: currentStock ≤ minStock (red)
- **Low**: currentStock ≤ minStock × 1.5 (yellow)
- **Normal**: currentStock > minStock × 1.5 (green)

### Permissions
- **View**: All authenticated users
- **Update Stock**: admin, maintenance_manager, procurement_manager, assistant_maintenance_manager, foreman
- **Create/Edit Parts**: admin, procurement_manager
- **Delete Parts**: admin only

## Known Issues
None at this time. All French text has been successfully translated to English.

## Next Steps
1. Test the application thoroughly
2. Verify all translations are correct
3. Check for any remaining French text in other modules
4. Update user documentation if needed
