export function notFoundHandler(request, response) {
  response.status(404).json({ success: false, message: "Endpoint not found" });
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error);
  const status = error.status || 500;
  if (process.env.NODE_ENV !== "test") console.error(error);
  response.status(status).json({
    success: false,
    message: status >= 500 ? "An unexpected server error occurred" : error.message,
  });
}
