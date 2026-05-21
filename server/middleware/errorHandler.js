export function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: {
      message: `No existe la ruta ${req.method} ${req.originalUrl}`,
      status: 404,
    },
  });
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || error.statusCode || mapMulterError(error) || 500;
  const isServerError = status >= 500;
  const exposeMessage = status < 500 || error.code === "GEMINI_API_KEY_MISSING";

  if (isServerError) {
    console.error(error);
  }

  res.status(status).json({
    ok: false,
    error: {
      message: exposeMessage ? error.message : "RAEEBot no pudo procesar la solicitud.",
      status,
      code: error.code || "REQUEST_ERROR",
    },
  });
}

function mapMulterError(error) {
  if (error.code === "LIMIT_FILE_SIZE") return 413;
  if (error.code === "LIMIT_FILE_COUNT") return 400;
  return null;
}
