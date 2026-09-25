const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const dns = require('node:dns');
let client;

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  try {
    if (!mongoUri || !mongoUri.startsWith('mongodb+srv://')) {
      throw new Error('Set MONGO_URI to the MongoDB Atlas mongodb+srv connection string.');
    }

    const dnsServers = process.env.MONGODB_DNS_SERVERS
      ?.split(',')
      .map((server) => server.trim())
      .filter(Boolean);
    if (dnsServers?.length) dns.setServers(dnsServers);

    client = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    mongoose.connection.setClient(client);
    console.log(`MongoDB Atlas connected: ${mongoose.connection.host}`);
    return true;
  } catch (err) {
    if (client) {
      await client.close().catch(() => {});
      client = undefined;
    }
    console.warn(`MongoDB connection failed. Starting server without database connectivity. ${err.message}`);
    return false;
  }
}

async function disconnectDB() {
  if (!client) return;
  await client.close();
  client = undefined;
}

module.exports = { connectDB, disconnectDB };
