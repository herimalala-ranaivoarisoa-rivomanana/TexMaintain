const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireUser } = require('./middleware/auth');
const BreakdownMedia = require('../models/BreakdownMedia');
const Media = require('../models/Media');

// Configure multer for memory storage
const storage = multer.memoryStorage();

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

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed types: images and videos only`), false);
    }

    cb(null, true);
  }
});

// Error handling middleware
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
    const { assetId, breakdownType, description } = req.body;

    if (!assetId || !breakdownType || !description) {
      return res.status(400).json({ error: 'Asset ID, breakdown type, and description are required' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Save files to Media collection
    const mediaPromises = req.files.map(file => {
      return Media.create({
        filename: file.originalname,
        contentType: file.mimetype,
        data: file.buffer,
        size: file.size,
        uploadedBy: req.user._id
      });
    });

    const savedMediaList = await Promise.all(mediaPromises);

    const files = savedMediaList.map((media, index) => ({
      filename: media.filename,
      originalName: media.filename,
      mimetype: media.contentType,
      size: media.size,
      path: `/api/media/${media._id}` // Use API URL instead of filesystem path
    }));

    const breakdownMedia = new BreakdownMedia({
      asset: assetId,
      breakdownType,
      description,
      files,
      createdBy: req.user._id
    });

    await breakdownMedia.save();

    console.log('✅ Breakdown media uploaded successfully (DB):', {
      id: breakdownMedia._id,
      asset: assetId,
      filesCount: files.length
    });

    res.status(201).json({
      message: 'Breakdown media uploaded successfully',
      breakdownMedia
    });
  } catch (error) {
    console.error('Error uploading breakdown media:', error);
    res.status(500).json({ error: 'Failed to upload breakdown media' });
  }
});

// GET /api/breakdown-media/asset/:assetId - Get all breakdown media
router.get('/asset/:assetId', requireUser, async (req, res) => {
  try {
    const breakdownMedia = await BreakdownMedia.find({ asset: req.params.assetId })
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
      .populate('asset')
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

    // Optionally delete the underlying Media documents?
    // For now, we just delete the breakdown record. 
    // The Media docs remain as orphans or we can clean them up. 
    // Given scope, orphan cleanup is secondary optimization.

    await BreakdownMedia.findByIdAndDelete(req.params.id);

    res.json({ message: 'Breakdown media deleted successfully' });
  } catch (error) {
    console.error('Error deleting breakdown media:', error);
    res.status(500).json({ error: 'Failed to delete breakdown media' });
  }
});

module.exports = router;
