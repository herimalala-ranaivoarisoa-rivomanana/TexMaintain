# TexMaintain Project Audit — Technical & Functional Analysis

> **Scope:** Complete audit of the TexMaintain project (backend + frontend), covering architecture, data schemas, pages/routes, CRUD flows, multi-tenancy, security, and identified inconsistencies.  
> **Date:** 2025  
> **Status:** Ongoing — detailed analysis of all major modules and components.

---

## 1) Project Structure & Stack

### **Repository Layout**
```
TexMaintain/
├── server/               # Node.js + Express + Mongoose
│   ├── models/           # Mongoose schemas
│   ├── routes/           # Express routers
│   ├── services/         # Business logic
│   ├── middleware/       # auth, validation
│   └── server.js         # Entry point (port 3000)
└── client/               # React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
    ├── src/
    │   ├── api/          # Axios clients
    │   ├── pages/        # React pages
    │   ├── components/   # Reusable UI
    │   ├── contexts/     # React contexts (Factory, Auth)
    │   └── main.tsx      # Entry point (port 5173)
```

### **Tech Stack**
- **Backend:** Node.js, Express, Mongoose, MongoDB, JWT auth, Zod validation
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, Radix UI/shadcn, Axios, React Router
- **Database:** MongoDB (multi-tenant via factory context)
- **Ports:** Backend 3000, Frontend 5173

### **Entry Points**
- Backend: `server/server.js` → listens on 3000
- Frontend: `client/src/main.tsx` → Vite dev server on 5173

---

## 2) Multi-tenancy & Authentication

### **JWT + Factory Context**
- JWT stored in localStorage (client) + sent via `Authorization: Bearer`
- Factory context (`activeFactoryId`) stored in localStorage (`FactoryContext`)
- Axios interceptor adds `x-factory-id` header automatically (except `/auth/me` and `/auth/login`)

### **Middleware**
- `requireUser` → validates JWT, sets `req.user`, computes `req.activeFactoryId` from header + user factories
- `requireRole` → role-based access control

### **Roles**
- `admin`, `maintenance_manager`, `assistant_maintenance_manager`, `production_manager`, `line_manager`, `machinist`, `mechanic`, `electrician`, `maintenance_worker`

---

## 3) Data Models (Mongoose Schemas)

### **Core Entities**
- `Asset` (with `factory`, `category`, `subCategory`, `status`, `machinist`, `qrCode`, etc.)
- `Intervention` (linked to `Asset`, `type`, `status`, `personnel`)
- `Part` (inventory, with embedded `pendingOrders[]`, `stockLevel`, `minStock`, `maxStock`, `reorderPoint`)
- `AssetPart` (association asset ↔ part, with criticality, replacement history)
- `Project` (budget, dates, progress, `factory` reference)
- `ProjectExpense` (linked to project, optional part)
- `User` (auth, `factories[]` array)
- `Factory` (name, code, `assetClasses[]`, `processAreas[]`)
- `Personnel` (SSOT for Machinist/Mechanic/Electrician/MaintenanceWorker, fields: `matricule`, `factory`, `role`, `specialization`, `certifications`, `isActive`)
- `AssetStatusHistory` (status change log)
- `AssetClass`, `ProcessArea`, `ProcessDepartment`, `Category`, `SubCategory`, `Brand`

### **Multi-tenant Pattern**
- Almost all operational entities include `factory` (ObjectId) reference.
- Backend routes filter by `req.activeFactoryId` **or** by reading `x-factory-id` header directly (inconsistent across routes).

---

## 4) API Routes Overview

### **Asset Management**
- `assetRoutes.js` → CRUD, status change, QR code, image upload, metrics, timeline, asset-part associations
- Services: `AssetStatusService`, `AssetMetricsService`, `AssetTimelineService`, `AssetPartsService`

### **Inventory**
- `inventoryRoutes.js` → list parts, update stock, CRUD parts, calculate min/max stock, create orders, update order status
- Orders are embedded inside `Part.pendingOrders[]`

### **Interventions**
- `interventionRoutes.js` → CRUD, start, complete, CSV export
- Service: `InterventionService`

### **Projects**
- `projectRoutes.js` → CRUD, stats, expenses, consume parts from inventory (decrements stock, creates expense)

### **Procurement**
- `procurementRoutes.js` → list orders, stats, create order, update status (auto-stock on 'received')

### **Reports**
- `reportsRoutes.js` → general stats, maintenance metrics, inventory metrics, financial metrics (TCO, top costly assets)
- Uses Mongoose aggregation heavily

### **Referentials (CRUD)**
- `categoryRoutes.js`, `subCategoryRoutes.js`, `brandsRoutes.js` → CRUD + statistics (aggregated by factory)
- `machinistRoutes.js`, `mechanicRoutes.js`, `electricianRoutes.js`, `maintenanceWorkerRoutes.js` → CRUD via `Personnel` model with role filter
- `personnelRoutes.js` → unified CRUD for all personnel roles
- `assetClassRoutes.js` → simple CRUD (no factory filter)
- `processDepartmentsRoutes.js` → CRUD + asset order update (used by ProcessAreaDetail)

### **Auth & Users**
- `authRoutes.js` → login, me
- `userRoutes.js` → CRUD users (admin only)

### **Factories**
- `factoriesRoutes.js` → CRUD factories (admin only)

### **Seeding**
- `seedRoutes.js` + `SeedService` → safe seeding (admin only), clears operational data only

---

## 5) Frontend Pages & API Clients

### **Main Pages**
- `Assets.tsx` → asset list, status change, QR, media upload, CRUD dialogs
- `Interventions.tsx` → list, start/complete, CSV export
- `Inventory.tsx` → list, stock update, CRUD, CSV export
- `AssetDetail.tsx` → single asset view, QR, timeline tabs
- `ProcessAreaDetail.tsx` → KPIs, departments list, drag&drop asset reorder
- `Projects.tsx` → list, stats, CRUD dialogs
- `ProjectDetails.tsx` → details, expenses, parts consumption
- `Procurement.tsx` → orders list, stats, create/update dialogs
- `Reports.tsx` → dashboard with charts (recharts)
- `Settings.tsx` → multi-tab (Profile, Notifications, Security, Integrations, System, Database with seeding)

### **Referential CRUD Pages**
- `Categories.tsx` → CRUD + stats per category
- `SubCategories.tsx` → CRUD + global stats
- `Brands.tsx` → CRUD + brand stats
- `Machinists.tsx`, `Mechanics.tsx`, `Electricians.tsx`, `MaintenanceWorkers.tsx` → CRUD personnel (role-specific)

### **Components**
- `AssetTimeline.tsx` → unified timeline (status, interventions, parts)
- `FactorySelector.tsx` → factory picker (multi-tenant)
- `Sidebar.tsx`, `TopNavigation.tsx` → layout
- Various dialogs (AssetStatusDialog, etc.)

### **API Clients**
- One file per domain (`assets.ts`, `inventory.ts`, `interventions.ts`, etc.) with TypeScript interfaces
- All use Axios with interceptors for auth and factory header

---

## 6) Inconsistencies & Risks Identified

### **Front/Back API Misalignments**
1. **Categories API**
   - Front: `PUT /api/asset-categories/:id`
   - Back: `PATCH /api/asset-categories/:id`
2. **SubCategories API**
   - Front expects `{ types }` in list response → back returns `{ subCategories }`
   - Front sends `{ category }` on create → back expects `{ categoryId }`
   - Front uses `PUT` → back expects `PATCH`
3. **AssetClasses API**
   - Front calls `'/asset-classes'` (no `/api`) → Vite proxy only handles `/api` → likely fails in dev
4. **ProductionSections API**
   - Front exposes API (`productionSections.ts`) → **no backend route found** (orphan)
5. **ProcessDepartments**
   - No factory filter → multi-tenant leak possible
6. **Reports Routes**
   - Use `req.activeFactoryId` but **missing `requireUser`** in file (security risk)

### **Multi-tenant Filtering Inconsistencies**
- Some routes use `req.activeFactoryId` (assets, inventory, dashboard, categories stats, brands stats)
- Others read `req.header('x-factory-id')` and require it (machinists/mechanics/electricians/workers, projects, personnel)
- Result: mixed patterns, potential errors if header missing

### **Personnel Model Constraints**
- `matricule` is unique globally (collection) → two factories cannot share the same matricule
- Soft delete (`isActive:false`) used for personnel

### **Asset-Part Associations**
- `AssetPartsService` handles criticality, replacement history, and stock consumption
- Stock decremented in `Part` when consumed for interventions or projects

---

## 7) Business Logic Highlights

### **Asset Status Flow**
- `AssetStatusService.changeStatus` validates transitions (e.g., machinist required for "In Production")
- History logged in `AssetStatusHistory`

### **Inventory & Procurement**
- Parts have `stockLevel`, `minStock`, `maxStock`, `reorderPoint`
- `pendingOrders[]` embedded in `Part`
- Order status updates can auto-increment stock when marked 'received'

### **KPIs & Metrics**
- `AssetMetricsService.calculateMetrics` → MTBF, MTTR, availability, OEE
- Financial metrics: TCO, top costly assets
- Reports use aggregation pipelines

### **Project Expenses**
- Expenses can be generic or linked to a part
- Consuming parts from inventory creates an expense and decrements stock

### **Timeline**
- Unified timeline (`AssetTimeline.tsx`) merges status changes, interventions, and parts usage

---

## 8) Security & Permissions

### **Middleware Usage**
- Most routes protected by `requireUser`
- Role checks via `requireRole` (admin, maintenance_manager, etc.)
- **Exception:** `reportsRoutes.js` appears to lack `requireUser` (risk)

### **Factory Access Control**
- Users belong to multiple factories (`factories[]` array)
- `requireUser` ensures `req.activeFactoryId` is in user's factories
- Some routes bypass this by reading header directly

---

## 9) Drag & Drop Asset Ordering

- `ProcessAreaDetail.tsx` allows reordering assets within departments
- Calls `updateProcessDepartmentAsset` (`PATCH /api/process-departments/:id/asset`)
- Optimistic UI updates, then server sync

---

## 10) Seeding & Database Management

- `SeedService` provides safe seeding (admin only)
- Clears operational data, preserves users and factories
- Seeding available via Settings page UI

---

## 11) Development & Build

- **Vite proxy:** only `/api` → backend
- **Allowed hosts:** localhost, .pythagora.ai
- **Watch ignores:** node_modules, dist, public, log

---

## 12) Next Steps / Recommendations

1. **Fix API misalignments** (PUT→PATCH, response shapes, endpoint paths)
2. **Standardize factory filtering** (prefer `req.activeFactoryId` everywhere)
3. **Add missing `requireUser` to reports routes**
4. **Resolve AssetClasses endpoint path** (add `/api` prefix)
5. **Decide on ProductionSections:** implement backend or remove frontend API
6. **Review Personnel matricule uniqueness** if cross-factory duplicates needed
7. **Add integration tests** for critical flows (status change, stock update, multi-tenant isolation)

---

## 13) File-by-File Analysis Summary

### **Backend**
- All major routes reviewed; patterns consistent except where noted
- Services encapsulate business logic (status, metrics, timeline, parts)
- Models use factory reference; indexes on factory + role where relevant

### **Frontend**
- Pages follow pattern: fetch data, display tables/lists, dialogs for CRUD
- API clients map 1:1 to backend routes (with misalignments)
- Factory context used everywhere; interceptor adds header

---

## 14) Conclusion

TexMaintain is a well-structured GMAO with clear separation of concerns, multi-tenancy, and comprehensive modules (assets, inventory, interventions, projects, procurement, reports). Most inconsistencies are minor (HTTP methods, response shapes) and easily fixable. The biggest risks are:
- Reports without auth middleware
- AssetClasses endpoint path (proxy issue)
- Mixed factory filtering patterns

Overall, the codebase is maintainable and follows good practices (services, middleware, TypeScript, shadcn/ui).

---

*Prepared by: Cascade (SWE-1.5)*
*Date: 2025*
