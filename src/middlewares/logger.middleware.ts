import { NextFunction, Request, Response } from "express";
import { logger } from "../helpers/Logger";

// Request Logger Middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const method = req.method;
  const url = req.originalUrl;

  logger.log(method, url);

  next();
};