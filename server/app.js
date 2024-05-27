const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');  // Import fs module
const uploadRoute = require('./routes/upload');
const config = require('./config');
const File = require('./models/file');

const PORT = process.env.PORT || 9091;
const app = express();

// Connection to database
mongoose.connect(config.mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}) 
.then(() => console.log('Database connected'))
.catch(err => console.log(err));

// Middleware
app.use(express.static(path.join(__dirname, 'Public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/upload', uploadRoute);

// Root route to serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Download route
app.get('/files/:uuid', async (req, res) => {
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

// Start server
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
