const mongoose = require('mongoose');

async function connectDB(url) {
  await mongoose.connect(url);
  // Make sure the unique indexes (roomCode, regNo, one booking per student+slot) exist.
  await mongoose.syncIndexes();
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
