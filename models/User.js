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
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model("User", userSchema);