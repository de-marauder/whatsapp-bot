import { Router } from "express";
import { WebhookCtrl } from "../controllers/Webhook/webhook";

export const WebhookRouter = Router();

WebhookRouter.get('/webhook', WebhookCtrl.verifyWebhook);
WebhookRouter.post('/webhook', WebhookCtrl.handleWebhook);