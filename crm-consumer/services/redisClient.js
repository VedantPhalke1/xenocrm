const { createClient } = require('redis');

const client = createClient({
    url: process.env.REDIS_URL
});

client.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis immediately
client.connect().catch(console.error);

module.exports = client;