import { LogTrail } from "../helpers/Logger";
import {
  AddressInteractiveWhatsappResponse,
  ButtonInteractiveWhatsappResponse,
  ListInteractiveWhatsappResponse,
  LocationRequestInteractiveWhatsappResponse,
  TextWhatsAppResponse,
} from "../types/response.types";

export class ResponseService {
  private readonly logger = new LogTrail('ResponseService');
  constructor() {
    this.logger.log('ResponseService loaded successfully...')
  }
  textResponse(to: string, body: string): TextWhatsAppResponse {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body,
      },
    }
  }

  buttonInteractiveResponse(
    to: string,
    body: string,
    buttons: ButtonInteractiveWhatsappResponse['interactive']['action']['buttons'],
  ): ButtonInteractiveWhatsappResponse {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: "button",
        header: "",
        body: {
          text: body
        },
        footer: {
          text: ""
        },
        action: {
          buttons
        }
      }
    }
  }

  listInteractiveResponse(
    to: string,
    body: string,
    sections: ListInteractiveWhatsappResponse['interactive']['action']['sections'],
    button: string,
  ): ListInteractiveWhatsappResponse {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: body,
        },
        action: {
          sections,
          button,
        },
      },
    }
  }

  locationRequestResponse(to: string, body: string): LocationRequestInteractiveWhatsappResponse {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'location_request_message',
        body: {
          text: body,
        },
        action: {
          name: 'send_location',
        },
      },
    }
  }

  addressInteractiveResponse(
    to: string,
    client: string,
    body: string,
    country = 'NG',
    values: AddressInteractiveWhatsappResponse['interactive']['action']['parameters']['values'],
  ): AddressInteractiveWhatsappResponse {
    const defaultValues = {
      name: client,
      phone_number: to,
      sg_post_code: '',
      address: "Some location",
      city: '',
    };
    values = {
      ...defaultValues,
      ...values
    }

    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'address_message',
        body: {
          text: body,
        },
        action: {
          name: 'address_message',
          parameters: {
            country,
            values,
            validation_errors: {
              sg_post_code: 'We could not locate this pin code.',
              phone_number: 'Invalid Phone number. Make sure the country code prefix matches the specified country',
            },
          },
        },
      },
    }
  }
}

export const responseService = new ResponseService();
