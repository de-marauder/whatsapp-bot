import axios, { AxiosError } from 'axios';
import { EnvVars } from '../config/loadEnv';
import { env } from '../helpers/env';
import { IntentsService, IntentsSvc } from './Intents.service';
import { LogTrail } from '../helpers/Logger';
import { ResponseTypes } from '../types/response.types';
import { AnyMessageEvent, MessageContact, MessageEvent } from '../types/message.types';

let WHATSAPP_API_URL = `https://graph.facebook.com/v20.0/${env(EnvVars.TEST_PHONE_NUMBER_ID)}/messages`;
let ACCESS_TOKEN = `${env(EnvVars.TEST_ACCESS_TOKEN)}`;

if (env(EnvVars.NODE_ENV) === 'production') {
  WHATSAPP_API_URL = `https://graph.facebook.com/v20.0/${env(EnvVars.PHONE_NUMBER_ID)}/messages`;
  ACCESS_TOKEN = `${env(EnvVars.ACCESS_TOKEN)}`;
}

export class MessagingService {
  private readonly logger = new LogTrail('MessagingService');
  constructor(private intentsSvc: IntentsService) {
    this.intentsSvc = intentsSvc;
    this.logger.log('MessagingService loaded successfully...')
  }

  process(message: MessageEvent, contact: MessageContact) {
    const clientName = contact.profile.name || contact.wa_id || message.from;
    return this.generateResponse(message as AnyMessageEvent, clientName);
  }

  async generateResponse(message: AnyMessageEvent, clientName: string) {
    const { message: response } = await this.intentsSvc.processIntent(message, clientName);
    await this.sendMessage(response);
    return response;
  };

  async sendMessage(body: ResponseTypes) {
    try {
      await axios.post(
        WHATSAPP_API_URL,
        body,
        {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      this.logger.error('Error sending message:', error);
      if (error instanceof AxiosError) this.logger.error('Error sending message:', error.response?.data.error);
    }
  };
}

export const MessagingSvc = new MessagingService(IntentsSvc);
