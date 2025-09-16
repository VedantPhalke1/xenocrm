const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { ensureAuth } = require('../middleware/auth');
const redisClient = require('../services/redisClient');
const { OpenAI } = require('openai');
const Campaign = require('../models/Campaign');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Schema for customer validation
const customerSchema = Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    totalSpends: Joi.number().min(0).default(0),
    visits: Joi.number().integer().min(0).default(0),
    lastVisit: Joi.date().iso()
});

// POST /api/customers - Ingest a single customer
router.post('/customers', async (req, res) => {
    const { error, value } = customerSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    try {
        await redisClient.publish('ingestion:customer', JSON.stringify(value));
        res.status(202).json({ message: 'Customer data accepted for processing.' });
    } catch (err) {
        console.error('Redis Publish Error:', err);
        res.status(500).json({ message: 'Could not queue customer data.' });
    }
});

// POST /api/campaigns - Create a new campaign
router.post('/campaigns', ensureAuth, async (req, res) => {
    const { rules, messageTemplate } = req.body;
    if (!rules || !messageTemplate) {
        return res.status(400).json({ message: 'Rules and message template are required.' });
    }
    
    try {
        const campaignJob = { rules, messageTemplate, userId: req.user.id };
        await redisClient.publish('campaign:start', JSON.stringify(campaignJob));
        res.status(202).json({ message: 'Campaign has been queued for execution.' });
    } catch (err) {
        console.error('Redis Publish Error:', err);
        res.status(500).json({ message: 'Could not queue campaign job.' });
    }
});

// GET /api/campaigns - Get campaign history
router.get('/campaigns', ensureAuth, async (req, res) => {
    try {
        const campaigns = await Campaign.find().sort({ createdAt: -1 });
        res.json(campaigns);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST /api/delivery-receipt - Webhook for vendor
router.post('/delivery-receipt', async (req, res) => {
    const { logId, status } = req.body;
    if (!logId || !status) {
        return res.status(400).json({ message: 'logId and status are required.' });
    }
    try {
        const receipt = { logId, status };
        // Publish to a channel for batch processing
        await redisClient.publish('delivery:receipt', JSON.stringify(receipt));
        res.status(200).send('Receipt acknowledged.');
    } catch (err) {
        console.error('Redis Publish Error:', err);
        res.status(500).send('Internal Server Error');
    }
});


// POST /api/segments/generate-from-text - AI Feature
router.post('/segments/generate-from-text', ensureAuth, async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ message: "Prompt is required." });
    }
    
    const systemPrompt = `
        You convert natural language into JSON for 'react-querybuilder'.
        Available fields: 'totalSpends' (number), 'visits' (number), 'lastVisit' (date as YYYY-MM-DD).
        Respond with only the JSON object.
    `;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0,
            response_format: { type: "json_object" },
        });

        const generatedJson = JSON.parse(response.choices[0].message.content);
        res.json(generatedJson);
    } catch (err) {
        console.error("AI Generation Error:", err);
        res.status(500).json({ message: "Failed to generate rules from text." });
    }
});


module.exports = router;