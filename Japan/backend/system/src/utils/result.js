export function success(data = {}) {
  return {
    success: true,
    data,
  };
}

export function failure(errorCode, message, detail = {}) {
  return {
    success: false,
    errorCode,
    message,
    detail,
  };
}
