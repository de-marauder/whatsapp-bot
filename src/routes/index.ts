import { Router } from "express";
import { WebhookRouter } from "./Webhook.router";

export const baseRouter = Router();

baseRouter.use(WebhookRouter);