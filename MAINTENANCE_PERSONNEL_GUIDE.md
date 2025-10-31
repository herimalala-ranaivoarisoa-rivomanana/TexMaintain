# Maintenance Personnel Management System

## Overview
This document describes the new maintenance personnel management system added to TexMaintain. The system allows you to manage three categories of maintenance personnel:

1. **Mechanics** - Specialized in mechanical repairs and maintenance
2. **Electricians** - Specialized in electrical systems and repairs
3. **General Maintenance Workers** - Handle general facility maintenance tasks

## Features

### Common Features (All Personnel Types)
- **CRUD Operations**: Create, Read, Update, Delete personnel records
- **Search & Filter**: Search by name or matricule
- **Status Management**: Active/Inactive status tracking
- **Specialization Tracking**: Each category has specific specializations
- **Certifications**: Track multiple certifications per person
- **Soft Delete**: Deactivation instead of permanent deletion

### Personnel Information
Each personnel record includes:
- **Matricule**: Unique identifier (required)
- **First Name**: (required)
- **Last Name**: (required)
- **Full Name**: Auto-generated from first and last name
- **Specialization**: Category-specific specialization
- **Certifications**: Array of certification names
- **Status**: Active/Inactive
- **Timestamps**: Created and updated dates

## Backend Implementation

### Models

#### 1. Mechanic Model (`server/models/Mechanic.js`)
**Specializations:**
- General Mechanics
- Hydraulics
- Pneumatics
- Welding
- Fabrication
- Other

#### 2. Electrician Model (`server/models/Electrician.js`)
**Specializations:**
- Industrial Electrical
- Control Systems
- Motor Repair
- Wiring
- Instrumentation
- Other

#### 3. MaintenanceWorker Model (`server/models/MaintenanceWorker.js`)
**Specializations:**
- Cleaning
- Painting
- General Repairs
- Facility Maintenance
- Grounds Keeping
- Other

### API Routes

#### Mechanics Routes (`/api/mechanics`)
- **GET /api/mechanics** - Get all mechanics (with pagination, search, filters)
- **GET /api/mechanics/:id** - Get single mechanic
- **POST /api/mechanics** - Create new mechanic
- **PUT /api/mechanics/:id** - Update mechanic
- **DELETE /api/mechanics/:id** - Deactivate mechanic (soft delete)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `q`: Search query (name or matricule)
- `isActive`: Filter by active status (true/false)
- `specialization`: Filter by specialization

**Permissions:**
- View: All authenticated users
- Create/Update: admin, maintenance_manager, assistant_maintenance_manager
- Delete: admin, maintenance_manager

#### Electricians Routes (`/api/electricians`)
Same structure as mechanics routes, with electrician-specific data.

#### Maintenance Workers Routes (`/api/maintenance-workers`)
Same structure as mechanics routes, with maintenance worker-specific data.

### Server Configuration
Routes are registered in `server/server.js`:
```javascript
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/electricians', electricianRoutes);
app.use('/api/maintenance-workers', maintenanceWorkerRoutes);
```

## Frontend Implementation

### API Functions

#### Mechanics API (`client/src/api/mechanics.ts`)
```typescript
getMechanics(params?: GetMechanicsParams): Promise<GetMechanicsResponse>
getMechanic(id: string): Promise<Mechanic>
createMechanic(data: MechanicFormData): Promise<Mechanic>
updateMechanic(id: string, data: Partial<MechanicFormData>): Promise<Mechanic>
deleteMechanic(id: string): Promise<void>
```

#### Electricians API (`client/src/api/electricians.ts`)
Same structure as mechanics API with electrician-specific types.

#### Maintenance Workers API (`client/src/api/maintenanceWorkers.ts`)
Same structure as mechanics API with maintenance worker-specific types.

### Pages

#### 1. Mechanics Page (`/mechanics`)
- **File**: `client/src/pages/Mechanics.tsx`
- **Icon**: Wrench (blue)
- **Features**:
  - List all mechanics with search
  - Add/Edit mechanics with specialization selection
  - Add/Remove certifications
  - Activate/Deactivate mechanics

#### 2. Electricians Page (`/electricians`)
- **File**: `client/src/pages/Electricians.tsx`
- **Icon**: Zap (yellow)
- **Features**: Same as Mechanics page

#### 3. General Maintenance Workers Page (`/maintenance-workers`)
- **File**: `client/src/pages/MaintenanceWorkers.tsx`
- **Icon**: HardHat (green)
- **Features**: Same as Mechanics page

### Navigation
All three pages are accessible from the sidebar:
- Mechanics (Wrench icon, blue)
- Electricians (Zap icon, yellow)
- General Maintenance Workers (HardHat icon, green)

Located after "Machinists" and before "Brands" in the sidebar.

### Routing
Routes are configured in `client/src/App.tsx`:
```typescript
<Route path="mechanics" element={<Mechanics />} />
<Route path="electricians" element={<Electricians />} />
<Route path="maintenance-workers" element={<MaintenanceWorkers />} />
```

## Usage Guide

### Adding a New Mechanic/Electrician/Worker

1. Navigate to the respective page from the sidebar
2. Click the "Add [Type]" button (top right)
3. Fill in the required fields:
   - Matricule (unique identifier)
   - First Name
   - Last Name
   - Specialization (select from dropdown)
4. Optionally add certifications:
   - Type certification name
   - Click "Add" or press Enter
   - Remove by clicking the X on the badge
5. Set Active status (checked by default)
6. Click "Create"

### Editing Personnel

1. Find the person in the list
2. Click the pencil icon in the Actions column
3. Modify the information
4. Click "Update"

### Deactivating Personnel

1. Find the person in the list
2. Click the trash icon in the Actions column
3. Confirm the deactivation
4. The person's status will change to "Inactive"

Note: Deactivation is a soft delete. The record remains in the database but is marked as inactive.

### Searching

Use the search box at the top of the list to search by:
- First name
- Last name
- Full name
- Matricule

The search is case-insensitive and updates in real-time.

## Database Schema

### Common Fields (All Models)
```javascript
{
  matricule: String (required, unique, indexed)
  firstName: String (required)
  lastName: String (required)
  fullName: String (auto-generated)
  specialization: String (enum, category-specific)
  certifications: [String]
  isActive: Boolean (default: true)
  createdAt: Date (immutable)
  updatedAt: Date
}
```

### Indexes
- `matricule`: Single field index for fast lookups
- `fullName, matricule`: Text index for search functionality

### Pre-save Hooks
- Auto-generate `fullName` from `firstName` and `lastName`
- Update `updatedAt` timestamp

## Testing

### Manual Testing Steps

1. **Start the application**
   ```bash
   # Start MongoDB
   npm run db:up
   
   # Start backend
   cd server && npm run dev
   
   # Start frontend
   cd client && npm run dev
   ```

2. **Test each personnel type**
   - Create a new record
   - Edit the record
   - Add certifications
   - Search for the record
   - Deactivate the record
   - Verify inactive records don't appear in active searches

3. **Test permissions**
   - Login with different user roles
   - Verify appropriate access levels

### API Testing with Postman

Test endpoints for each personnel type:
```
GET    /api/mechanics
GET    /api/mechanics/:id
POST   /api/mechanics
PUT    /api/mechanics/:id
DELETE /api/mechanics/:id

GET    /api/electricians
GET    /api/electricians/:id
POST   /api/electricians
PUT    /api/electricians/:id
DELETE /api/electricians/:id

GET    /api/maintenance-workers
GET    /api/maintenance-workers/:id
POST   /api/maintenance-workers
PUT    /api/maintenance-workers/:id
DELETE /api/maintenance-workers/:id
```

## Files Created/Modified

### Backend Files Created
- `server/models/Mechanic.js`
- `server/models/Electrician.js`
- `server/models/MaintenanceWorker.js`
- `server/routes/mechanicRoutes.js`
- `server/routes/electricianRoutes.js`
- `server/routes/maintenanceWorkerRoutes.js`

### Backend Files Modified
- `server/server.js` - Added route registrations

### Frontend Files Created
- `client/src/api/mechanics.ts`
- `client/src/api/electricians.ts`
- `client/src/api/maintenanceWorkers.ts`
- `client/src/pages/Mechanics.tsx`
- `client/src/pages/Electricians.tsx`
- `client/src/pages/MaintenanceWorkers.tsx`

### Frontend Files Modified
- `client/src/components/Sidebar.tsx` - Added navigation items
- `client/src/App.tsx` - Added routes

## Future Enhancements

Potential improvements for the maintenance personnel system:

1. **Skills Matrix**: Track specific skills and proficiency levels
2. **Training Records**: Log training sessions and certifications expiry
3. **Work Assignment**: Assign personnel to specific interventions
4. **Availability Calendar**: Track schedules and availability
5. **Performance Metrics**: Track KPIs for each personnel
6. **Document Attachments**: Upload certificates and documents
7. **Contact Information**: Add phone, email, emergency contacts
8. **Department Assignment**: Assign to specific departments or teams
9. **Shift Management**: Track work shifts and schedules
10. **Reporting**: Generate reports on personnel statistics

## Support

For issues or questions:
1. Check this documentation
2. Review the code comments in the respective files
3. Test the API endpoints using Postman
4. Check browser console for frontend errors
5. Check server logs for backend errors

## Conclusion

The maintenance personnel management system provides a comprehensive solution for tracking mechanics, electricians, and general maintenance workers. The system follows the same patterns as the existing machinist system, ensuring consistency across the application.
