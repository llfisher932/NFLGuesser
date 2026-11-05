import type { ErrorRequestHandler, RequestHandler } from "express";

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);

  const status = err.status ?? 500;
  res.status(status).json({
    error: status === 500 ? "Internal server error" : err.message,
  });
};
