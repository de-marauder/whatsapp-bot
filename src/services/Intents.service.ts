import { PriceList } from "../constants/pricing.const";
import { LogTrial } from "../helpers/Logger";
import { randomSixDigits } from "../helpers/random";
import { IOrder, OrderModel } from "../model/Order.model";
import {
  AnyMessageEvent,
  buttonReplyInteractiveMessageEvent,
  LocationMessageEvent,
  ReplyInteractiveMessageEvent,
  TextMessageEvent,
} from "../types/message.types";
import { ResponseTypes } from "../types/response.types";
import { responseService, ResponseService } from "./Response.service";

type IntentConfig = Record<Intent, {
  condition: (message: string, client?: string) => Promise<boolean> | boolean
  getResponse: (to?: string, client?: string) => ResponseTypes
  handler: (messageEvent: AnyMessageEvent, clientName?: string) => Promise<ResponseTypes>
}>
const SPECIAL_DELIMITER = '-*-';

export class IntentsService {
  private readonly logger = new LogTrial('IntentsService');

  constructor(private responseSvc: ResponseService) {
    this.responseSvc = responseSvc;
  }
  private config: IntentConfig = {
    greeting: {
      condition: (message) => (
        message.toLocaleLowerCase().includes('hello') ||
        message.toLocaleLowerCase().includes('hi') ||
        message.toLocaleLowerCase().includes('good day') ||
        message.toLocaleLowerCase().includes('good morning') ||
        message.toLocaleLowerCase().includes('good afternoon') ||
        message.toLocaleLowerCase().includes('good evening')
      ),
      handler: async (messageEvent, client) => {
        return this.config.greeting.getResponse(messageEvent.from, client);
      },
      getResponse: (to, client) => {
        return this.responseSvc.textResponse(
          to!,
          `
Hello ${client}!
How can I assist you today?
Use the \`/help\` command to view my options
        `
        )
      },
    },
    help: {
      condition: async (message) => (
        message.toLocaleLowerCase().startsWith('/help') ||
        message.toLocaleLowerCase().startsWith('help') ||
        message.toLocaleLowerCase().includes('can you do') ||
        message.toLocaleLowerCase().includes('do')
      ),
      handler: async (messageEvent) => {
        const mEvent = messageEvent as TextMessageEvent;
        const [, subCommand] = mEvent.text.body.split(' ');
        if (subCommand) {
          switch (subCommand) {
            case 'order':
              return this.responseSvc.textResponse(
                mEvent.from,
                `
You can create, update, and end an order using the \`/order\` command.
- \`/order\` - Create a new order session
- \`/orders\` - View all your orders
- \`/order <order_id>\` - View a specific order
- \`/order <order_id> end\` - End an order session
- \`/order <order_id> <id of item in pricelist> <count of item>\` - Update a property of an order
                `
              )
            default:
              return this.config.help.getResponse(messageEvent.from)
          }
        }
        return this.config.help.getResponse(messageEvent.from)
      },
      getResponse: (to) => {
        return this.responseSvc.textResponse(to!,
          `
Here are some things I can help with: ...
- \`/help\` - show the help message
- \`/order\` - Manage an order (create, update, end session)
- \`/orders\` - View orders
- \`/info\` - Show information about our services

Type  \`/help <command>\` for more information about a command
Eg. \`/help order\` to view more information about the order command
        `
        )
      }
    },
    info: {
      condition: (message) => (
        message.toLocaleLowerCase().startsWith('/info') ||
        message.toLocaleLowerCase().startsWith('info') ||
        message.toLocaleLowerCase().includes('pricing') ||
        message.toLocaleLowerCase().includes('about')
      ),
      handler: async (messageEvent) => {
        return this.config.info.getResponse(messageEvent.from)
      },
      getResponse: (to) => {
        return this.responseSvc.textResponse(to!, `
Welcome to our services. We offer:
- Pick up services
- Delivery services

Here is our pricing information
${(() => {
            let out = ''
            let count = 1
            for (const [item, price] of PriceList) {
              out += `- ${count}. ${item}: ${price}\n`;
              count++
            }
            return out;
          })()
          }
        `
        )
      }
    },
    order: {
      condition: async (message, client) => {
        this.logger.log('order condition => ', message, message.toLocaleLowerCase().includes('order'))
        return (
          // message.toLocaleLowerCase().includes('/order') ||
          message.toLocaleLowerCase().includes('order') ||
          (await this.isLatestOrderPickUp(client!))[0]
        );
      },
      handler: async (messageEvent) => {
        const mEvent = messageEvent as TextMessageEvent;
        const bEvent = messageEvent as buttonReplyInteractiveMessageEvent;
        const lEvent = messageEvent as LocationMessageEvent;
        let [isLatestOrderPickUp, order] = await this.isLatestOrderPickUp(lEvent.from)

        // Update order pickup location
        if (lEvent.location && isLatestOrderPickUp && order) {
          order.pickupAddress = {
            address: lEvent.location.address,
            longitude: lEvent.location.longitude,
            latitude: lEvent.location.latitude,
          }
          await order.save();
          const body = `
          Your latest order has been updated with the pickup address: ${lEvent.location.address}
          Update your order details using \`/order ${order.sessionId} <id-of-item-on-price-list> <count-of-items> \`
          Check \`/info\` to view price list. 
          `
          return this.responseSvc.buttonInteractiveResponse(
            lEvent.from,
            body,
            [{
              type: "reply",
              reply: {
                id: `button-${randomSixDigits()}`,
                title: "Pricing"
              }
            }],
          )
        } else if (mEvent.text?.body.split(' ').length === 1) {
          const [command] = mEvent.text?.body.split(' ');
          // create new order
          if (
            command.toLocaleLowerCase() === 'order' ||
            command.toLocaleLowerCase() === '/order'
          ) {
            order = await OrderModel.create({
              sessionId: `ord-${randomSixDigits()}`,
              session: 'active',
              user: mEvent.from,
            })
            // return interactive response
            const response = `
          Order session created.
          Use the command \`/order ${order.sessionId}\` to access it.
          Would you like the pickup service or the dropoff service?
          `
            const reply = this.responseSvc.buttonInteractiveResponse(
              mEvent.from,
              response,
              [
                {
                  type: 'reply',
                  reply: {
                    id: `p${SPECIAL_DELIMITER}${order.sessionId}`,
                    title: 'Pickup Service',
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: `d${SPECIAL_DELIMITER}${order.sessionId}`,
                    title: 'Dropoff Service',
                  },
                },
              ],
            );

            return reply
          } else if (
            command === 'orders' ||
            command === '/orders'
          ) {
            // Show all orders and their session states
            const orders = await OrderModel.find({ user: mEvent.from })
            .sort({ updatedAt: -1 })
            .limit(20);
            if (orders.length > 0) {
              let response = `Here are your most recent ${orders.length} orders:\n`;
              orders.forEach((o) => {
                response += `- ${o.sessionId}  (${o.session})\n`;
              });
              return this.responseSvc.textResponse(mEvent.from, response);
            } else {
              return this.responseSvc.textResponse(mEvent.from, 'No active orders found.');
            }
          }
        } else if (
          mEvent.text?.body.split(' ').length === 2 ||
          bEvent.interactive?.button_reply?.title.split(' ').length === 2
        ) {
          // Display order information
          const sessionId = mEvent.text?.body.split(' ')[1] || bEvent.interactive?.button_reply?.title.split(' ')[1];
          order = await OrderModel.findOne({ sessionId, user: mEvent.from });
          if (!order) {
            return this.responseSvc.textResponse(mEvent.from, `No active order with session id ${sessionId} found.`);
          }
          let reply = 'Here\'s your order\n';
          reply += `\nSession ID: ${order.sessionId} *(${order.session})*\n`;
          reply += '\nOrder details:\n';
          if (order.toObject().details) {
            let total = 0;
            order.toObject<IOrder>().details.forEach((v, k) => {
              const priceItem = PriceList.find((el) => (el[0] === k));
              if (priceItem) {
                reply += `- ${k}  x${v} @  #${priceItem ? priceItem[1] : '0.00'} a piece\n`
                total += parseFloat(`${priceItem[1]}`) * parseInt(v);
              }
            });
            reply += `\n*Total: #${total.toFixed(2)}*\n`
          } else {
            reply += '\n*=====No Details=====*\n'
          }
          reply += '\n*===================*\n'
          const allowedFields = ['type', 'pickupDate', 'dropoffDate'];
          const addresses = ['pickupAddress', 'dropoffAddress']
          for (const [k, v] of Object.entries(order.toObject())) {
            if (allowedFields.includes(k)) {
              reply += `${k}: ${v}\n`
            }
            if (k === addresses[0] || k === addresses[1]) {
              reply += `Address: ${order.toObject()[k as keyof typeof order].address}`
            }
          }
          this.logger.log(reply)
          return this.responseSvc.textResponse(mEvent.from, reply);
        } else if (mEvent.text?.body.split(' ').length === 3) {
          // End order session
          const [_, sessionId, instruction] = mEvent.text.body.split(' ');
          if (instruction === 'end' || instruction === 'complete') {
            await OrderModel.findOneAndUpdate(
              { sessionId, session: 'active', user: mEvent.from },
              { session: 'ended' }
            );

            return this.responseSvc.textResponse(mEvent.from, `Order session with ID ${sessionId} has been ended.`);
          }
        } else if (mEvent.text?.body.split(' ').length === 4) {
          // Update order details
          const [_, sessionId, itemId, count] = mEvent.text.body.split(' ')
          const order = await OrderModel.findOne({ sessionId, session: 'active' });
          if (!order) {
            return this.responseSvc.textResponse(mEvent.from, `
            No active order with session id ${sessionId} found.
          `)
          }
          if (!order.details) order.details = new Map();
          order.details.set(`${PriceList[+itemId][0]}`, count)
          await order.save();
          this.logger.log('Order updated => ', order.toObject())
          return this.responseSvc.buttonInteractiveResponse(
            mEvent.from,
            `Order details updated for session ${sessionId}.`,
            [{
              type: "reply",
              reply: {
                id: `button-${randomSixDigits()}`,
                title: `/order ${sessionId}`
              }
            }]
          )
        }

        return this.config.default.getResponse(mEvent.from);
      },
      getResponse: (to) => {
        return this.responseSvc.textResponse(to!, `
        A session for a new order has started.
        `)
      }
    },
    pickup: {
      condition: async (message) => (
        message.toLocaleLowerCase().startsWith(`p${SPECIAL_DELIMITER}ord-`)
      ),
      handler: async (messageEvent, clientName) => {
        const bEvent = messageEvent as buttonReplyInteractiveMessageEvent;

        // update order type
        if (bEvent.interactive.button_reply.title.toLocaleLowerCase().startsWith('pickup')) {
          const sessionId = bEvent.interactive.button_reply.id.split(SPECIAL_DELIMITER)[1];

          const order = await OrderModel.findOne({ sessionId, user: bEvent.from, session: 'active' });
          if (!order) {
            return this.responseSvc.textResponse(bEvent.from, `
            No active order with id ${sessionId} found.
          `)
          }
          // Request pickup address or set pickup address
          order.type = 'pickup';
          await order.save();
          // return interactive response
          const responseBody = `
          Please provide the pick up address for your laundry order ${sessionId}.
          `
          const reply = this.responseSvc.locationRequestResponse(bEvent.from, responseBody);
          return reply
        }
        return this.config.pickup.getResponse(messageEvent.from);
      },
      getResponse: (to) => {
        return this.responseSvc.textResponse(to!, `
        Your pickup order has been scheduled. A delivery date will be communicated to you. Thank you.
        `)
      }
    },
    dropoff: {
      condition: async (message) => (
        message.toLocaleLowerCase().startsWith(`d${SPECIAL_DELIMITER}ord-`)
      ),
      handler: async (messageEvent) => {
        return this.config.dropoff.getResponse(messageEvent.from);
      },
      getResponse: (to) => {
        return this.responseSvc.textResponse(to!, 'Service Not available')
      }
    },
    default: {
      condition: () => false,
      handler: async (messageEvent) => {
        return this.config.default.getResponse(messageEvent.from);
      },
      getResponse: (to) => {
        return this.responseSvc.textResponse(to!, `
Sorry, I didn’t understand that.
Can you please rephrase?
Use \`/help\` to view my options.
        `
        )
      }
    }
  }

  processIntent = async (messageEvent: AnyMessageEvent, clientName: string) => {
    let intent: Intents = Intents.DEFAULT;
    const to = messageEvent.from;
    switch (messageEvent.type) {
      case 'text':
        intent = await this.calculateIntentFromTextData(messageEvent.text.body);
        break;
      case 'location':
        intent = await this.calculateIntentFromLocationData(messageEvent.location.address || 'location', to);
        break;
      case 'image':
        intent = await this.calculateIntentFromImageData(messageEvent.image.caption);
        break;
      case 'interactive':
        intent = await this.calculateIntentFromInteractiveReplyData(messageEvent.interactive);
        break;
      default:
        return {
          intent,
          message: this.config.default.getResponse(to),
        };
    }
    const message = await this.handleIntent(intent, messageEvent, clientName);
    return { intent, message }
  }

  calculateIntentFromTextData = async (message: string) => {
    let intent = Intents.DEFAULT;
    if (await this.config.help.condition(message)) {
      intent = Intents.HELP;
    } else if (await this.config.order.condition(message)) {
      intent = Intents.ORDER;
    } else if (await this.config.pickup.condition(message)) {
      intent = Intents.PICKUP;
    } else if (await this.config.info.condition(message)) {
      intent = Intents.INFO;
    } else if (await this.config.greeting.condition(message)) {
      intent = Intents.GREETING;
    }
    return intent;
  }

  calculateIntentFromImageData = async (caption: string) => {
    let intent = Intents.DEFAULT;
    return intent;
  }

  calculateIntentFromLocationData = async (caption: string, client?: string) => {
    let intent = Intents.DEFAULT;

    if (await this.config.order.condition(caption, client)) {
      intent = Intents.ORDER;
    }

    return intent;
  }

  calculateIntentFromInteractiveReplyData = async (interactive: ReplyInteractiveMessageEvent['interactive']) => {
    let body = '';

    switch (interactive.type) {
      case 'list_reply':
        body = `${interactive.list_reply.id}${SPECIAL_DELIMITER}${interactive.list_reply.title}${SPECIAL_DELIMITER}${interactive.list_reply.description}`
        break;
      case 'nfm_reply':
        body = interactive.nfm_reply.body
        break;
      case 'button_reply':
        body = `${interactive.button_reply.id}${SPECIAL_DELIMITER}${interactive.button_reply.title}${SPECIAL_DELIMITER}`
        break;
      default:
        break;
    }

    let intent = Intents.DEFAULT;
    if (await this.config.help.condition(body)) {
      intent = Intents.HELP;
    } else if (await this.config.order.condition(body)) {
      intent = Intents.ORDER;
    } else if (await this.config.pickup.condition(body)) {
      intent = Intents.PICKUP;
    } else if (await this.config.info.condition(body)) {
      intent = Intents.INFO;
    } else if (await this.config.greeting.condition(body)) {
      intent = Intents.GREETING;
    }

    return intent;
  }

  handleIntent = async (intent: Intent, messageEvent: AnyMessageEvent, clientName: string) => {
    const message = await this.config[intent].handler(messageEvent, clientName);
    return message;
  }

  private isLatestOrderPickUp = async (phone: string): Promise<[boolean, IOrder | null]> => {
    const latestOrder = (await OrderModel.find({
      user: phone,
      session: 'active',
      type: 'pickup',
    }).sort({ 'createdAt': -1 }))[0];

    if (!latestOrder) return [false, latestOrder];
    return [true, latestOrder];
  }
}



export const IntentsSvc = new IntentsService(responseService);

export type Intent = Intents
export const enum Intents {
  GREETING = 'greeting',
  HELP = 'help',
  ORDER = 'order',
  PICKUP = 'pickup',
  DROPOFF = 'dropoff',
  INFO = 'info',
  DEFAULT = 'default',
}