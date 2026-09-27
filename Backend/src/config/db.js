const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const dns = require('node:dns');
let client;
let connectionPromise;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return true;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    const mongoUri = process.env.MONGO_URI;

    try {
      // Accepts both mongodb+srv:// (Atlas, the production case) and plain
      // mongodb:// (local/dev instances, CI, mongodb-memory-server in tests)
      // — only the scheme is checked, so a stray typo doesn't silently hang
      // on a 5s server-selection timeout instead of failing fast.
      if (!mongoUri || !/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
        throw new Error('Set MONGO_URI to a valid mongodb:// or mongodb+srv:// connection string.');
      }

      const dnsServers = process.env.MONGODB_DNS_SERVERS
        ?.split(',')
        .map((server) => server.trim())
        .filter(Boolean);
      if (dnsServers?.length) dns.setServers(dnsServers);

      const mongoClient = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      await mongoClient.connect();
      mongoose.connection.setClient(mongoClient);
      client = mongoClient;
      console.log(`MongoDB connected: ${mongoose.connection.host}`);
      return true;
    } catch (err) {
      console.warn(`MongoDB connection failed. ${err.message}`);
      return false;
    }
  })();

  const connected = await connectionPromise;
  if (!connected) connectionPromise = undefined;
  return connected;
}

async function disconnectDB() {
  if (!client) return;
  await client.close();
  client = undefined;
  connectionPromise = undefined;
}

module.exports = { connectDB, disconnectDB };
