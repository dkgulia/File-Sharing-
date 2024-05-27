const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    filename: {
        type: String,  
        required: true
    },
    path: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    uuid: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24  // Expires after 24 hours
    }
});

module.exports = mongoose.model('File', FileSchema);
