# Bug Fix: Equipment Creation Error (500 Internal Server Error)

## Problem Description

When attempting to create a new equipment from the `/equipment` page, the application returned a **500 Internal Server Error**.

### Error Details
```
POST http://localhost:5173/api/equipment 500 (Internal Server Error)
```

## Root Cause

The issue was in the equipment creation route (`server/routes/equipmentRoutes.js`, line 326-354).

When creating a new equipment, the code was calling `EquipmentStatusService.changeStatus()` to create the initial status history entry. However, this service method includes validation logic that checks if the status transition is allowed using the `canTransitionTo()` method.

For a **newly created equipment** that doesn't have a previous status, this validation was failing because:
1. The equipment was created with an initial status
2. The `changeStatus` service was called immediately after
3. The service tried to validate the transition from `undefined` (no previous status) to the new status
4. The validation logic wasn't designed to handle the initial status assignment

## Solution

Modified the equipment creation route to:
1. Create the equipment with the initial status
2. **Directly create** the status history entry without going through the validation service
3. This bypasses the transition validation for the initial status (which is appropriate since there's no previous state to validate against)

### Code Changes

**File:** `server/routes/equipmentRoutes.js`

**Before:**
```javascript
router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  try {
    const parse = equipmentSchema.safeParse(req.body || {});
    if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
    
    const created = await Equipment.create({
      ...parse.data,
      lastStatusChangedBy: req.user._id
    });
    
    // Create initial status history entry
    await EquipmentStatusService.changeStatus(
      created._id,
      created.status,
      req.user._id,
      { reason: 'Initial equipment creation', notes: 'Equipment added to system' }
    );
    
    const populated = await Equipment.findById(created._id)
      .populate('category')
      .populate('type')
      .populate('lastStatusChangedBy', 'email role')
      .lean();
    
    return res.status(201).json({ success: true, equipment: populated });
  } catch (error) {
    console.error('Create equipment error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create equipment' });
  }
});
```

**After:**
```javascript
router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  try {
    const parse = equipmentSchema.safeParse(req.body || {});
    if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
    
    const created = await Equipment.create({
      ...parse.data,
      lastStatusChangedBy: req.user._id,
      lastStatusChange: new Date()
    });
    
    // Create initial status history entry (without validation since it's the first status)
    await EquipmentStatusHistory.create({
      equipment: created._id,
      previousStatus: null,
      newStatus: created.status,
      changedBy: req.user._id,
      reason: 'Initial equipment creation',
      notes: 'Equipment added to system',
      timestamp: new Date()
    });
    
    const populated = await Equipment.findById(created._id)
      .populate('category')
      .populate('type')
      .populate('lastStatusChangedBy', 'email role')
      .lean();
    
    return res.status(201).json({ success: true, equipment: populated });
  } catch (error) {
    console.error('Create equipment error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create equipment' });
  }
});
```

**Also added import:**
```javascript
const { STATUS_METADATA, EquipmentStatusHistory } = require('../models/EquipmentStatusHistory');
```

## Testing

After applying this fix:

1. **Restart the backend server** (if not using nodemon):
   ```bash
   cd server
   npm run dev
   ```

2. **Test equipment creation:**
   - Navigate to `/equipment`
   - Click "Add Equipment"
   - Fill in all required fields:
     - Category
     - Type
     - Status
     - Location
   - Click "Create"
   - Equipment should be created successfully

3. **Verify status history:**
   - View the created equipment details
   - Check the status history tab
   - You should see the initial status entry with:
     - Previous Status: None
     - New Status: [selected status]
     - Reason: "Initial equipment creation"
     - Notes: "Equipment added to system"

## Impact

- ✅ Equipment creation now works correctly
- ✅ Initial status history is properly recorded
- ✅ Subsequent status changes continue to use the validation service
- ✅ No impact on existing equipment or status change functionality

## Related Files

- `server/routes/equipmentRoutes.js` - Fixed equipment creation route
- `server/services/equipmentStatusService.js` - Status change service (unchanged)
- `server/models/Equipment.js` - Equipment model (unchanged)
- `server/models/EquipmentStatusHistory.js` - Status history model (unchanged)

## Notes

- The fix maintains the integrity of the status history tracking
- Initial status assignment bypasses validation (as it should)
- All subsequent status changes still go through proper validation
- The `EquipmentStatusService.changeStatus()` method remains unchanged and continues to work for status updates
