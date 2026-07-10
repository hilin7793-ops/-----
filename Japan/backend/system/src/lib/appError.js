export class AppError extends Error {
  constructor({ code, message, detail = {}, cause } = {}) {
    super(message ?? code ?? "Application error");
    this.name = "AppError";
    this.code = code ?? "UNKNOWN_ERROR";
    this.detail = detail;
    this.cause = cause;
  }
}

export function assert(condition, errorFactory) {
  if (condition) {
    return;
  }

  throw errorFactory();
}
