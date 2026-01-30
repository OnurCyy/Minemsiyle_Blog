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
        resetCode: {
            type: String,
            default: null
        },
        role: {
            type: String,
            enum: ["admin", "user"],
            default: "user",
        },
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
        profileImage: {
            type: String,
            default: "https://cdn-icons-png.flaticon.com/512/149/149071.png"
        },
        bio: {
            type: String,
            default: "Merhaba, ben yeni bir kitap kurduyum! 📚"
        },
        xp: {
            type: Number,
            default: 0
        },
        level: {
            type: Number,
            default: 1
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model("User", userSchema);