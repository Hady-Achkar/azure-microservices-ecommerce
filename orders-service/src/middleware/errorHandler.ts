import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Validation error",
      details: error.errors,
    });
  }

  res.status(500).json({
    error: "Internal server error",
  });
}
