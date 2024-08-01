import { Request, Response } from 'express';
import { env } from '../../helpers/env';
import { EnvVars } from '../../config/loadEnv';
import { HandlerWrapper } from '../../helpers/handlerWrapper';
import { logger, LogTrail } from '../../helpers/Logger';
import { MessagingService, MessagingSvc } from '../../services/Messaging.service';


const WEBHOOK_VERIFICATION_TOKEN = env(EnvVars.WEBHOOK_VERIFICATION_TOKEN);

export class WebhookController {
  private readonly logger = new LogTrail('WebhookController');
  
  constructor(private messagingSvc: MessagingService) {
    this.messagingSvc = messagingSvc;
    this.logger.log('WebhookController loaded successfully...')
  }

  verifyWebhook = HandlerWrapper(async (req: Request, res: Response) => {
    if (req.query['hub.verify_token'] !== WEBHOOK_VERIFICATION_TOKEN) {
      return res.status(500).send();
    }
    const response = req.query['hub.challenge']
    res.status(200).send(response);
  })

  handleWebhook = HandlerWrapper(async (req: Request, res: Response) => {
    // Extract the incoming message
    const data = req.body;
    const changes = data.entry[0].changes[0];
    logger.log('value => ', JSON.stringify(changes))

    if (changes.value.messages && changes.value.messages[0]) {
      const reply = await this.messagingSvc.process(changes.value.messages[0], changes.value.contacts[0]);
      return res.status(200).send(reply);
    }
    return res.status(500).send();
  })
}

export const WebhookCtrl = new WebhookController(MessagingSvc)
