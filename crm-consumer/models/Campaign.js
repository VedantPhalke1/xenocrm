const mongoose = require('mongoose');
const CampaignSchema = new mongoose.Schema({
    audienceSize: { type: Number, required: true },
    rules: { type: Object, required: true },
    messageTemplate: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Campaign', CampaignSchema);