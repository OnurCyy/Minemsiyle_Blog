const mongoose = require("mongoose");

const siteSettingsSchema = new mongoose.Schema({
    maintenanceMode: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model("SiteSettings", siteSettingsSchema);