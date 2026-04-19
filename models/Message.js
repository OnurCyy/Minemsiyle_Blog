const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true
    },
    profilePic: {
        type: String,
        default: 'default-avatar.png'
    },
    text: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    recipient: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model('Message', MessageSchema);