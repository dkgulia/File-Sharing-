const express = require('express');
const multer = require('multer');
const path = require('path');
const shortid = require('shortid');
const qr = require('qr-image');
const File = require('../models/file');
const router = express.Router();
const fs = require('fs');

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/');
        console.log(`Storing file in: ${uploadPath}`);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${shortid.generate()}${path.extname(file.originalname)}`;
        console.log(`Generated file name: ${uniqueName}`);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
}).single('fileInput');

// Route for handling file uploads
router.post('/', (req, res) => {
    console.log('Received a file upload request');
    upload(req, res, async (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(500).json({ error: err.message });
        }

        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        try {
            console.log('Uploaded file info:', req.file);

            const file = new File({
                filename: req.file.filename,
                uuid: shortid.generate(),
                path: req.file.path,
                size: req.file.size
            });

            const response = await file.save();
            console.log('File saved to MongoDB:', response);

            const downloadLink = `${req.protocol}://${req.get('host')}/files/${response.uuid}`;
            const qrCode = qr.imageSync(downloadLink, { type: 'png' });

            res.status(200).json({
                file: downloadLink,
                qrCode: qrCode.toString('base64')
            });
        } catch (error) {
            console.error('Error saving file to database:', error);
            return res.status(500).json({ error: error.message });
        }
    });
});


// Route for downloading files
router.get('/:uuid', async (req, res) => {
    console.log('Download route hit');
    try {
        console.log(`Received download request for UUID: ${req.params.uuid}`);
        const file = await File.findOne({ uuid: req.params.uuid });
        if (!file) {
            console.error('File not found for UUID:', req.params.uuid);
            return res.status(404).json({ error: 'File not found' });
        }
        console.log(`File found in database: ${file}`);

        const filePath = path.resolve(file.path);
        console.log(`Resolved file path: ${filePath}`);

        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                console.error('File does not exist:', err);
                return res.status(404).json({ error: 'File not found on disk' });
            }
            res.download(filePath, file.filename, (err) => {
                if (err) {
                    console.error('Error during file download:', err);
                    res.status(500).send({ error: err.message });
                } else {
                    console.log('File successfully downloaded:', filePath);
                }
            });
        });
    } catch (err) {
        console.error('Error downloading file:', err);
        res.status(500).send({ error: err.message });
    }
});


module.exports = router;
