const mongoose = require("mongoose");

const SubscriberSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true // Aynı maille 2 kere abone olunamaz!
    },
}, { timestamps: true });

module.exports = mongoose.model("Subscriber", SubscriberSchema);