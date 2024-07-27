import { NextFunction, Request, Response } from "express";
import { logger } from "../helpers/Logger";
import { APIError } from "../helpers/CustomError";
import Joi from "joi";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err);
  let statusCode = 500;
  let message = 'Internal Server Error';
  let response: Record<string, any> = { statusCode: statusCode, message: message };

  if (err instanceof APIError) {
    response.statusCode = err.statusCode;
    response.message = err.message;
  } else if (err instanceof Joi.ValidationError) {
    response.statusCode = 400;
    response.message = err.message;
    response.errors = err.details;
  }

  return res.status(statusCode).json(response);
}
