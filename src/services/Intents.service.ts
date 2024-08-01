import { PriceList } from "../constants/pricing.const";
import { LogTrail } from "../helpers/Logger";
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
  private readonly logger = new LogTrail('IntentsService');

  constructor(private responseSvc: ResponseService) {
    this.responseSvc = responseSvc;
    this.logger.log('IntentsService loaded successfully...')
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
        message.toLocaleLowerCase().includes('help') ||
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
- \`/order current\` - View current order
- \`/order <order_id>\` - View a specific order
- \`/order cancel\` - End current order session and delete
- \`/order end\` - End current order session and submit
- \`/order address\` - Update order pickup address
- \`/order add item-[itemId], count-[count]; item-[itemId], count-[count]; ...\` - Update a property of an order
    Eg. order add item-2, count-2; item-3, count-4
    Use the \`;\` semicolon to add multiple items
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
        message.toLocaleLowerCase().includes('price') ||
        message.toLocaleLowerCase().includes('list') ||
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
Update your order details using 
- \`/order add item-[itemId], count-[count]; item-[itemId], count-[count]; ...\` 

  Eg. \`/order add item-2, count-2; item-3, count-4\`
    Use the \`;\` semicolon to add multiple items
          `
          return this.responseSvc.buttonInteractiveResponse(
            lEvent.from,
            body,
            [
              {
                type: "reply",
                reply: {
                  id: `button-${randomSixDigits()}`,
                  title: "Pricing"
                }
              },
              {
                type: "reply",
                reply: {
                  id: `${order.sessionId}`,
                  title: "Order Details"
                }
              },
            ],
          )
        } else if (mEvent.text?.body.split(' ').length === 1) {
          const [command] = mEvent.text?.body.split(' ');
          // create new order
          if (
            command.toLocaleLowerCase() === 'order' ||
            command.toLocaleLowerCase() === '/order'
          ) {
            // check if prev open order exists
            const prev = await OrderModel.find({ user: mEvent.from, session: 'active' });
            if (!prev[0]) {
              order = await OrderModel.create({
                sessionId: `ord-${randomSixDigits()}`,
                session: 'active',
                user: mEvent.from,
              })

            } else {
              order = prev[0];
            }
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
                // {
                //   type: 'reply',
                //   reply: {
                //     id: `d${SPECIAL_DELIMITER}${order.sessionId}`,
                //     title: 'Dropoff Service',
                //   },
                // },
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
          const secondStr = mEvent.text?.body.split(' ')[1] || bEvent.interactive?.button_reply?.id.split(' ')[0];
          // End order session
          if (secondStr === 'end' || secondStr === 'complete') {
            const [order] = await OrderModel.find({ session: 'active', user: mEvent.from })
              .sort({ createdAt: -1 })
              .limit(1);
            if (!order) return this.responseSvc.textResponse(mEvent.from, 'No active order found.');
            order.session = 'ended';
            await order.save();
            const body = order
              ? `Your Order session has ended and been submitted.`
              : 'No active order found.'
            return this.responseSvc.buttonInteractiveResponse(mEvent.from,
              body,
              [
                {
                  type: 'reply',
                  reply: {
                    id: `${order.sessionId}`,
                    title: 'Order Details',
                  }
                },
              ],
            );
          } else if (secondStr === 'cancel' || secondStr === 'delete') {
            const [order] = await OrderModel.find({ session: 'active', user: mEvent.from })
              .sort({ createdAt: -1 })
              .limit(1);
            if (!order) return this.responseSvc.textResponse(mEvent.from, 'No active order found.');
            await order.deleteOne();
            return this.responseSvc.textResponse(mEvent.from, order
              ? `Your Order has been cancelled.`
              : 'No active order found.');
          } else if (secondStr === 'address') {
            const responseBody = `Please provide the pick up address for your laundry order ${secondStr}.`
            return this.responseSvc.locationRequestResponse(bEvent.from, responseBody);
          } else if (secondStr === 'current') {
            order = null;
            [order] = await OrderModel.find({ user: mEvent.from, session: 'active' })
              .sort({ createdAt: -1 })
              .limit(1);
          } else if (secondStr.startsWith('ord-')) {
            order = null;
            order = await OrderModel.findOne({ user: mEvent.from, sessionId: secondStr });
          } else { return this.config.order.getResponse(mEvent.from); }

          if (!order) {
            return this.responseSvc.textResponse(mEvent.from, `
              No active order found.
              Please create a new order
              Use the command \`/order\` to create it.`)
          }
          let reply = 'Here\'s your order\n';
          reply += `\nSession ID: ${order.sessionId} *(${order.session})*\n`;
          const date = new Date(order.createdAt);
          reply += `Created on: ${date.toTimeString().split(' ')[0]}, ${date.toDateString()}\n`;
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
          return this.responseSvc.textResponse(mEvent.from, reply);
        } else {
          // Update order details
          const [_, instruction, ...query] = mEvent.text.body.split(' ')
          if (instruction === 'add') {
            this.logger.log('adding...')
            const [order] = await OrderModel.find({ user: mEvent.from, session: 'active' }).sort({ createdAt: -1 }).limit(1);
            if (!order) return this.responseSvc.textResponse(mEvent.from, `No active order found.`)

            if (!order.details) order.details = new Map();
            const itemList = parseUpdateQuery(query.join(' '));
            if (!itemList) {
              return this.responseSvc.textResponse(mEvent.from, `
Please use this format to update your order.
\`/order add item-[itemId], count-[count]; item-[itemId], count-[count]; ...\`

Eg. To order 3 shirts and 2 native-men laundry where the shirt's itemId is 5 and native-men's itemId is 2 (as seen from \`/info\`),
Use => \`/order add item-5, count-3; item-2, count-2\`

Make sure to add the commas and semicolons 👍🏾
                `)
            }
            for (const { itemId, count } of itemList) {
              order.details.set(`${PriceList[+itemId - 1][0]}`, count)
              await order.save();
              this.logger.log('Order updated => ', order.toObject())
            }
            return this.responseSvc.buttonInteractiveResponse(
              mEvent.from,
              `Order details updated for session ${order.sessionId}.`,
              [{
                type: "reply",
                reply: {
                  id: `${order.sessionId}`,
                  title: `Order Details`
                }
              }]
            )
          }
        }

        return this.config.order.getResponse(mEvent.from);
      },
      getResponse: (to) => {
        return this.responseSvc.textResponse(to!, `
          Use the following format to make an order
          \`/order\`
        Use \`/help order\` to find out how to use other commands
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

const parseUpdateQuery = (query: string) => {
  const itemQueries = query.split(';');
  const parsedItemQueries = [];
  for (const itemQuery of itemQueries) {
    // item-<id>, count-<count>; ...
    const [itemId, count] = itemQuery.split(',').map((part) => part.split('-')[1].trim());
    if (!itemId || !count) return null;
    parsedItemQueries.push({ itemId, count });

  }
  return parsedItemQueries;
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