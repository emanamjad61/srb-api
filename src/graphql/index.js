const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express5');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');

// Starts Apollo and returns the Express middleware that serves POST /graphql.
async function createGraphQLMiddleware() {
  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();
  return expressMiddleware(apollo);
}

module.exports = { createGraphQLMiddleware };
