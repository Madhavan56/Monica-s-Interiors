export class AppError extends Error {
  constructor(code, status, message, fields) {
    super(message);
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export const notFound = (what = 'That') => new AppError('NOT_FOUND', 404, `${what} wasn’t found.`);

/** Wrap async route handlers so rejections reach the error handler. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
