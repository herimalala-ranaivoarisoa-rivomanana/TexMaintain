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

const fileFilter = (req, file, cb) => {
  // Accept images and videos only
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// POST /api/breakdown-media - Upload breakdown media
router.post('/', requireUser, upload.array('files', 10), async (req, res) => {
  try {
    const { equipmentId, breakdownType, description } = req.body;

    if (!equipmentId || !breakdownType || !description) {
      // Clean up uploaded files if validation fails
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
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
