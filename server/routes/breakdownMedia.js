const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const BreakdownMedia = require('../models/BreakdownMedia');
const { requireUser } = require('./middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/breakdown-media');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Secure upload configuration with validation
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 5 // Maximum 5 files per request
  },
  fileFilter: function (req, file, cb) {
    // Allowed MIME types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/mpeg',
      'video/quicktime'
    ];
    
    // Allowed extensions
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mpeg', '.mov'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed types: images and videos only`), false);
    }
    
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`), false);
    }
    
    cb(null, true);
  }
});

// POST /api/breakdown-media - Upload breakdown media
// Error handling middleware for multer errors
const handleUpload = (req, res, next) => {
  upload.array('files', 5)(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'File too large. Maximum size is 10MB per file.' 
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ 
          error: 'Too many files. Maximum is 5 files per upload.' 
        });
      }
      if (err.message) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: 'File upload failed' });
    }
    next();
  });
};

router.post('/', requireUser, handleUpload, async (req, res) => {
  try {
    const { equipmentId, breakdownType, description } = req.body;
    
    console.log('📤 Breakdown media upload request:', {
      equipmentId,
      breakdownType,
      description,
      filesCount: req.files ? req.files.length : 0,
      user: req.user.email
    });

    if (!equipmentId || !breakdownType || !description) {
      // Clean up uploaded files if validation fails
      if (req.files) {
        req.files.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (err) {
            console.error('Error deleting file:', err);
          }
        });
      }
      return res.status(400).json({ error: 'Equipment ID, breakdown type, and description are required' });
    }

    const files = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `/uploads/breakdown-media/${file.filename}`
    }));

    const breakdownMedia = new BreakdownMedia({
      equipment: equipmentId,
      breakdownType,
      description,
      files,
      createdBy: req.user._id
    });

    await breakdownMedia.save();
    
    console.log('✅ Breakdown media uploaded successfully:', {
      id: breakdownMedia._id,
      equipment: equipmentId,
      filesCount: files.length
    });

    res.status(201).json({
      message: 'Breakdown media uploaded successfully',
      breakdownMedia
    });
  } catch (error) {
    console.error('Error uploading breakdown media:', error);
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      });
    }
    res.status(500).json({ error: 'Failed to upload breakdown media' });
  }
});

// GET /api/breakdown-media/equipment/:equipmentId - Get all breakdown media for an equipment
router.get('/equipment/:equipmentId', requireUser, async (req, res) => {
  try {
    const breakdownMedia = await BreakdownMedia.find({ equipment: req.params.equipmentId })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.json({ breakdownMedia });
  } catch (error) {
    console.error('Error fetching breakdown media:', error);
    res.status(500).json({ error: 'Failed to fetch breakdown media' });
  }
});

// GET /api/breakdown-media/:id - Get specific breakdown media
router.get('/:id', requireUser, async (req, res) => {
  try {
    const breakdownMedia = await BreakdownMedia.findById(req.params.id)
      .populate('equipment')
      .populate('createdBy', 'fullName email');

    if (!breakdownMedia) {
      return res.status(404).json({ error: 'Breakdown media not found' });
    }

    res.json({ breakdownMedia });
  } catch (error) {
    console.error('Error fetching breakdown media:', error);
    res.status(500).json({ error: 'Failed to fetch breakdown media' });
  }
});

// DELETE /api/breakdown-media/:id - Delete breakdown media
router.delete('/:id', requireUser, async (req, res) => {
  try {
    const breakdownMedia = await BreakdownMedia.findById(req.params.id);

    if (!breakdownMedia) {
      return res.status(404).json({ error: 'Breakdown media not found' });
    }

    // Delete files from filesystem
    breakdownMedia.files.forEach(file => {
      const filePath = path.join(__dirname, '..', file.path);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    });

    await BreakdownMedia.findByIdAndDelete(req.params.id);

    res.json({ message: 'Breakdown media deleted successfully' });
  } catch (error) {
    console.error('Error deleting breakdown media:', error);
    res.status(500).json({ error: 'Failed to delete breakdown media' });
  }
});

module.exports = router;
