require('dotenv').config();
const connectDB = require('./config/db');
const redisClient = require('./services/redisClient');
const Customer = require('./models/Customer');
const Campaign = require('./models/Campaign');
const CommunicationLog = require('./models/CommunicationLog');
const fetch = require('node-fetch');
const { formatQuery } = require('react-querybuilder'); // Utility for converting rules

connectDB();

const VENDOR_RECEIPT_API = process.env.VENDOR_RECEIPT_API;

const sendToVendor = async (logId, message) => {
    const success = Math.random() < 0.9; // 90% success rate
    console.log(`[VENDOR] Sending message for log ${logId}. Success: ${success}`);

    // Simulate hitting a vendor, which then calls our receipt API back
    setTimeout(() => {
        fetch(VENDOR_RECEIPT_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                logId: logId,
                status: success ? 'SENT' : 'FAILED',
            }),
        }).catch(err => console.error('[VENDOR] Callback failed:', err));
    }, 500 + Math.random() * 1000); // Simulate network delay
};

// --- Ingestion Consumer ---
async function processIngestion() {
    const subscriber = redisClient.duplicate();
    await subscriber.connect();

    await subscriber.subscribe('ingestion:customer', async (message) => {
        const payload = JSON.parse(message);
        try {
            await Customer.findOneAndUpdate({ email: payload.email }, payload, { upsert: true, new: true });
            console.log(`[INGESTION] Processed and saved customer: ${payload.email}`);
        } catch (err) {
            console.error(`[INGESTION] Error processing customer ${payload.email}:`, err);
        }
    });
    console.log('[INGESTION] Listening for new customers...');
}

// --- Campaign Consumer ---
async function processCampaigns() {
    const subscriber = redisClient.duplicate();
    await subscriber.connect();

    await subscriber.subscribe('campaign:start', async (message) => {
        const { rules, messageTemplate } = JSON.parse(message);
        console.log(`[CAMPAIGN] Starting campaign with template: "${messageTemplate}"`);
        
        try {
            // This is a simplified conversion. A real-world scenario needs more robust parsing.
            const mongoQuery = formatQuery(rules, 'mongodb');

            const audience = await Customer.find(mongoQuery);
            if (audience.length === 0) {
                console.log('[CAMPAIGN] No audience found for the given rules.');
                return;
            }

            const campaign = await Campaign.create({
                audienceSize: audience.length,
                rules: rules,
                messageTemplate: messageTemplate,
            });
            console.log(`[CAMPAIGN] Created campaign ${campaign._id} for ${audience.length} users.`);

            for (const customer of audience) {
                const personalizedMessage = `Hi ${customer.name}, ${messageTemplate}`;
                const log = await CommunicationLog.create({
                    campaignId: campaign._id,
                    customerId: customer._id,
                    status: 'PENDING',
                });
                await sendToVendor(log._id, personalizedMessage);
            }
        } catch (err) {
            console.error('[CAMPAIGN] Error processing campaign:', err);
        }
    });
    console.log('[CAMPAIGN] Listening for new campaign jobs...');
}


// --- Delivery Receipt Consumer ---
async function processReceipts() {
    const subscriber = redisClient.duplicate();
    await subscriber.connect();

    // In a high-traffic system, you'd buffer these updates.
    await subscriber.subscribe('delivery:receipt', async (message) => {
        const { logId, status } = JSON.parse(message);
        try {
            const log = await CommunicationLog.findByIdAndUpdate(logId, { status }, { new: true });
            if (!log) return;

            const updateField = status === 'SENT' ? 'sentCount' : 'failedCount';
            await Campaign.findByIdAndUpdate(log.campaignId, { $inc: { [updateField]: 1 } });
            console.log(`[RECEIPT] Updated log ${logId} to ${status}`);
        } catch (err) {
            console.error(`[RECEIPT] Error updating log ${logId}:`, err);
        }
    });
    console.log('[RECEIPT] Listening for delivery receipts...');
}


processIngestion().catch(console.error);
processCampaigns().catch(console.error);
processReceipts().catch(console.error);