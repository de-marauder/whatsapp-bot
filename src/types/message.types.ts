
export interface MessageContact {
  profile: { name: string },
  wa_id: string
}

export interface MessageEvent {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'interactive' | 'location';
}

export interface TextMessageEvent extends MessageEvent {
  type: 'text';
  text: {
    body: string
  }
}
export interface ImageMessageEvent extends MessageEvent {
  type: 'image';
  image: {
    caption: string;
    mime_type: string;
    sha256: string;
    id: string
  };
}
export interface LocationMessageEvent extends MessageEvent {
  type: "location"
  location: {
    address: string,
    latitude: string,
    longitude: string,
    name: string
  },
}
export interface InteractiveMessageEvent extends MessageEvent {
  type: 'interactive';
  interactive: {
    type: 'nfm_reply' | 'list_reply' | 'button_reply';
  }
}
export interface nfmReplyInteractiveMessageEvent extends InteractiveMessageEvent {
  interactive: {
    type: 'nfm_reply';
    action: 'address_message';
    nfm_reply: {
      name: string;
      response_json: any;
      body: string;
    }
  }
}
export interface buttonReplyInteractiveMessageEvent extends InteractiveMessageEvent {
  interactive: {
    type: "button_reply";
    button_reply: {
      id: string;
      title: string
    }
  }
}
export interface listReplyInteractiveMessageEvent extends InteractiveMessageEvent {
  interactive: {
    type: "list_reply";
    list_reply: {
      id: string;
      title: string;
      description: string;
    }
  }
}

export type ReplyInteractiveMessageEvent =
  | nfmReplyInteractiveMessageEvent
  | buttonReplyInteractiveMessageEvent
  | listReplyInteractiveMessageEvent

export type AnyMessageEvent =
  | TextMessageEvent
  | ImageMessageEvent
  | LocationMessageEvent
  | ReplyInteractiveMessageEvent
