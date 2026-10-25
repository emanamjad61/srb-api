const http = require('http');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const createApp = require('./app');
const { initSocket } = require('./realtime/socket');

async function start() {
  await connectDB(env.mongoUrl);

  const app = await createApp();
  const httpServer = http.createServer(app);
  const io = initSocket(httpServer, { adminKey: env.adminKey });

  httpServer.listen(env.port, () => {
    console.log(`srb-api listening on http://localhost:${env.port}`);
    console.log(`  REST     http://localhost:${env.port}/api/v1`);
    console.log(`  GraphQL  http://localhost:${env.port}/graphql`);
    console.log(`  Board    http://localhost:${env.port}/board.html?room=ROOM-01`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`);
    io.close();
    httpServer.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
