const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireUser } = require('./middleware/auth');
const Media = require('../models/Media');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Secure upload configuration with validation
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max per file (strictly under 16MB BSON limit)
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

// Error handling middleware for multer errors
const handleUpload = (req, res, next) => {
    upload.array('media', 5)(req, res, (err) => {
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

// POST /api/media - Upload generic media to DB
router.post('/', requireUser, handleUpload, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadPromises = req.files.map(file => {
            return Media.create({
                filename: file.originalname,
                contentType: file.mimetype,
                data: file.buffer,
                size: file.size,
                uploadedBy: req.user._id
            });
        });

        const savedMedia = await Promise.all(uploadPromises);
        const urls = savedMedia.map(media => `/api/media/${media._id}`);

        console.log('✅ Media stored in DB successfully:', {
            count: urls.length,
            user: req.user.email
        });

        res.status(201).json({
            success: true,
            urls
        });
    } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ error: 'Failed to process upload' });
    }
});

// GET /api/media/:id - Serve media from DB
router.get('/:id', async (req, res) => {
    try {
        const media = await Media.findById(req.params.id);
        if (!media) {
            return res.status(404).json({ error: 'Media not found' });
        }

        res.set('Content-Type', media.contentType);
        res.set('Content-Disposition', `inline; filename="${media.filename}"`);
        res.send(media.data);
    } catch (error) {
        console.error('Error serving media:', error);
        res.status(500).json({ error: 'Failed to retrieve media' });
    }
});

module.exports = router;
