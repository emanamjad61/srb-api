// An error that already knows which HTTP status (and optional machine code) it maps to.
class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }

  static badRequest(message, code = 'BAD_REQUEST') {
    return new ApiError(400, message, code);
  }

  static notFound(message, code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message, code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }

  static unprocessable(message, code = 'VALIDATION_ERROR') {
    return new ApiError(422, message, code);
  }
}

module.exports = ApiError;
