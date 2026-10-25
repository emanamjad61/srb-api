const ApiError = require('../utils/ApiError');

function notFound(req, _res, next) {
  next(ApiError.notFound('Route not found', 'ROUTE_NOT_FOUND'));
}

module.exports = notFound;
