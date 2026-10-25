const path = require('path');
const express = require('express');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');
const apiRoutes = require('./routes');
const { createGraphQLMiddleware } = require('./graphql');

// Builds the Express app. It is async because Apollo must start before
// /graphql is mounted, and /graphql must come before the 404 handler.
async function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/health', healthRoutes);
  app.use('/api/v1', apiRoutes);
  app.use('/graphql', await createGraphQLMiddleware());

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
