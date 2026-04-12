const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            require: true,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            require: true,
            unique: true,
            lowercase: true,
        },
        password: {
            type: String,
            require: true,
        },
        googleId: {
            type: String,
            default: null
        },
        discordId: {
            type: String
        },
        twitterId: {
            type: String
        },
        resetCode: {
            type: String,
            default: ""
        },
        resetCodeExpires: {
            type: Date
        },
        role: {
            type: String,
            enum: ["admin", "user"],
            default: "user",
        },
        savedItems: [{
            itemId: { type: String },
            title: { type: String },
            type: { type: String }, // 'blog' mu yoksa 'book' mu?
            url: { type: String },
            savedAt: { type: Date, default: Date.now }
        }],
        isBanned: {
            type: Boolean,
            default: false
        },
        banReason: {
            type: String,
            default: null
        },
        bannedAt: {
            type: Date,
            default: null
        },
        badges: {
            type: [String],
            default: []
        },
        avatar: {
            type: String,
            default: "https://cdn-icons-png.flaticon.com/512/149/149071.png"
        },
        bio: {
            type: String,
            default: "Merhaba, ben yeni bir kitap kurduyum! 📚"
        },
        level: {
            type: Number,
            default: 1
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model("User", userSchema);