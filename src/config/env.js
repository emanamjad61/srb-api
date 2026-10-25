require('dotenv').config({ quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in environment. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  mongoUrl: required('MONGODB_URL'),
  adminKey: required('ADMIN_KEY'),
};
