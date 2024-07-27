const r = {
  'messaging_product': 'whatsapp',
  'recipient_type': 'individual',
  'to': '<WHATSAPP_USER_PHONE_NUMBER>',
  'type': 'interactive',
  'interactive': {
    'type': 'list',
    header: {
      type: "text",
      text: "<MESSAGE_HEADER_TEXT"
    },
    body: {
      text: "<MESSAGE_BODY_TEXT>"
    },
    footer: {
      text: "<MESSAGE_FOOTER_TEXT>"
    },
    action: {
      sections: [
        {
          title: "<SECTION_TITLE_TEXT>",
          rows: [
            {
              id: "<ROW_ID>",
              title: "<ROW_TITLE_TEXT>",
              description: "<ROW_DESCRIPTION_TEXT>"
            }
            /* Additional rows would go here*/
          ]
        }
        /* Additional sections would go here */
      ],
      button: "<BUTTON_TEXT>",
    }
  }
}

const r2 = {
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to: "PHONE_NUMBER",
  type: "interactive",
  interactive: {
    type: "address_message",
    body: {
      text: "Thanks for your order! Tell us what address you’d like this order delivered to."
    },
    action: {
      name: "address_message",
      parameters: {
        country: "COUNTRY_ISO_CODE"
      }
    }
  }
}

const listReply = {
  value: {
    messaging_product: "whatsapp",
    metadata: {
      display_phone_number: "15556261946",
      phone_number_id: "358804007321594"
    },
    contacts: [{
      profile: {
        name: "Marauder san 👤"
      },
      wa_id: "2348165520839"
    }],
    messages: [{
      context: {
        from: "15556261946",
        id: "wamid.HBgNMjM0ODE2NTUyMDgzORUCABEYEjQzMUE5NkYyRThGNDVBRTc5NQA="
      },
      from: "2348165520839",
      id: "wamid.HBgNMjM0ODE2NTUyMDgzORUCABIYFjNFQjBERTI2OEM0QzA3NTVGOUI2QkYA",
      timestamp: "1722006230",
      type: "interactive",
      interactive: {
        type: "list_reply",
        list_reply: {
          id: "275812",
          title: "Pickup Service",
          description: "Select to opt for pickup service"
        }
      }
    }]
  },
  field: "messages"
}

const locationReq = {
  interactive: {
    type: "location_request_message",
    body: {
      text: "<BODY_TEXT>"
    },
    action: {
      name: "send_location"
    }
  }
}

const interactiveButton = {
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to: "<WHATSAPP_USER_PHONE_NUMBER>",
  type: "interactive",
  interactive: {
    type: "button",
    header: "<MESSAGE_HEADER>",
    body: {
      text: "<BODY_TEXT>"
    },
    footer: {
      text: "<FOOTER_TEXT>"
    },
    action: {
      buttons: [
        {
          type: "reply",
          reply: {
            id: "<BUTTON_ID>",
            title: "<BUTTON_LABEL_TEXT>"
          }
        }
      ]
    }
  }
}


const defaultR = {
  messaging_product: 'whatsapp',
  to: '',
  type: 'text',
  text: { body: 'text' },
}

interface WhatsappResponse {
  messaging_product: 'whatsapp',
  to: string,
  type: 'text' | 'interactive',
}

export interface TextWhatsAppResponse extends WhatsappResponse {
  type: 'text',
  text: { body: string }
}

interface InteractiveWhatsappResponse extends WhatsappResponse {
  type: 'interactive';
  interactive: {
    type: 'list' | 'address_message' | 'location_request_message' | 'button'
  }
}

export interface ButtonInteractiveWhatsappResponse extends InteractiveWhatsappResponse {
  interactive: {
    type: "button";
    header?: string;
  body: {
    text: string
  };
  footer?: {
    text: string
  };
  action: {
    buttons: {
      type: "reply";
      reply: {
        id: string;
        title: string
      }
    }[]
  }
}
}

export interface ListInteractiveWhatsappResponse extends InteractiveWhatsappResponse {
  interactive: {
    type: 'list';
    header?: {
      type: 'text';
      text: string;
    };
    body: {
      text: string
    };
    footer?: {
      text: string
    };
    action: {
      sections: {
        title: string;
        rows: {
          id: string,
          title: string,
          description: string
        }[]
      }[],
      button: string,
    }
  }
}

export interface LocationRequestInteractiveWhatsappResponse extends InteractiveWhatsappResponse {
  interactive: {
    type: 'location_request_message';
    body: {
      text: string
    };
    action: {
      name: 'send_location'
    }
  }
}

export interface AddressInteractiveWhatsappResponse extends InteractiveWhatsappResponse {
  interactive: {
    type: 'address_message';
    body: {
      text: string
    };
    action: {
      name: 'address_message';
      parameters: {
        country: string; // country code
        values: {
          name: string;
          phone_number: string;
          sg_post_code: string;
          address: string;
          city: string
        };
        validation_errors?: {
          sg_post_code: 'We could not locate this pin code.';
          phone_number: 'Invalid Phone number. Make sure the country code prefix matches the specified country'
        }
      }
    }
  }
}

export type ResponseTypes =
  | TextWhatsAppResponse
  | ButtonInteractiveWhatsappResponse
  | AddressInteractiveWhatsappResponse
  | ListInteractiveWhatsappResponse
  | LocationRequestInteractiveWhatsappResponse