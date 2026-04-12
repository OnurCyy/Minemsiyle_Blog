const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    avatar: { type: String },
    content: { type: String, required: true },
    contentType: {
        type: String,
        required: true,
        enum: ['book', 'blog']
    },
    relatedId: {
        type: String,
        required: true
    },
    title: { type: String },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Comment", CommentSchema);