import axios, { AxiosError } from 'axios';
import { EnvVars } from '../config/loadEnv';
import { env } from '../helpers/env';
import { IntentsService, IntentsSvc } from './Intents.service';
import { logger } from '../helpers/Logger';
import { ResponseTypes } from '../types/response.types';
import { AnyMessageEvent, ImageMessageEvent, MessageContact, MessageEvent, ReplyInteractiveMessageEvent, TextMessageEvent } from '../types/message.types';


const WHATSAPP_API_URL = `https://graph.facebook.com/v20.0/${env(EnvVars.PHONE_NUMBER_ID)}/messages`;
const ACCESS_TOKEN = `${env(EnvVars.ACCESS_TOKEN)}`;

export class MessagingService {
  constructor(private intentsSvc: IntentsService) {
    this.intentsSvc = intentsSvc;
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
      logger.error('Error sending message:', error);
      if (error instanceof AxiosError) logger.error('Error sending message:', error.response?.data.error);
    }
  };
}

export const MessagingSvc = new MessagingService(IntentsSvc);
