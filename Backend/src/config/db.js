// MongoDB connection helpers shared by the server, the serverless entry and
// the scripts. A native MongoClient is connected once and handed to Mongoose,
// and the in-flight connection promise is cached so concurrent requests share
// a single connection attempt instead of each opening their own.

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const dns = require('node:dns');
let client;
let connectionPromise;

/**
 * Connects to MONGO_URI if not already connected. Resolves true when the
 * database is reachable and false otherwise — it never throws, so callers can
 * reply 503 instead of crashing. A failed attempt is forgotten, so the next
 * call tries again.
 */
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

      // Optional comma-separated DNS servers to resolve with — useful on networks
      // whose default resolver can't look up the SRV records mongodb+srv:// needs.
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

/** Closes the shared client and resets state so connectDB() can reconnect later. */
async function disconnectDB() {
  if (!client) return;
  await client.close();
  client = undefined;
  connectionPromise = undefined;
}

module.exports = { connectDB, disconnectDB };
