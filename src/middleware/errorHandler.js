const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

// Turns any thrown error into an ApiError so the response shape is always the same.
function toApiError(err) {
  if (err instanceof ApiError) return err;

  // Malformed JSON body from express.json()
  if (err.type === 'entity.parse.failed') {
    return ApiError.badRequest('Request body is not valid JSON', 'INVALID_JSON');
  }
  if (err.type === 'entity.too.large') {
    return new ApiError(413, 'Request body is too large', 'PAYLOAD_TOO_LARGE');
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors).map((e) => e.message).join('; ');
    return ApiError.unprocessable(message, 'VALIDATION_ERROR');
  }
  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${err.path}`, 'BAD_REQUEST');
  }
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {}).join(', ');
    return ApiError.conflict(`A record with the same ${fields || 'key'} already exists`, 'DUPLICATE');
  }
  return new ApiError(500, 'Internal server error', 'INTERNAL_ERROR');
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const apiError = toApiError(err);
  if (apiError.status >= 500) console.error(err);

  const body = { error: { status: apiError.status, message: apiError.message } };
  if (apiError.code) body.error.code = apiError.code;
  res.status(apiError.status).json(body);
}

module.exports = { errorHandler, toApiError };
