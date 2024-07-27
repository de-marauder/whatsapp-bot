import { Schema, model, Document } from 'mongoose';

const services = ['order']

type Address = {
  address: string;
  longitude: string;
  latitude: string;
};

export interface IOrder extends Document {
  sessionId: string;
  session: 'active' | 'ended';
  user: string;
  service: 'order';
  details: Map<string, string>;
  type: 'pickup' | 'dropoff';
  pickupDate: Date;
  pickupAddress: Address;
  pickedUp: boolean;
  dropoffDate: Date;
  dropoffAddress: Address;
  droppedOff: boolean;
}

const OrderSchema = new Schema<IOrder>(
  {
    sessionId: { type: String },
    session: { type: String, enum: ['active', 'ended'] },
    user: { type: String },
    service: { type: String, enum: services },
    details: { type: Map, of: String },
    type: { type: String, enum: ['pickup', 'dropoff'] },
    pickupDate: { type: Date },
    pickupAddress: {
      type: {
        address: String,
        longitude: String,
        latitude: String,
      }
    },
    pickedUp: Boolean,
    dropoffDate: { type: Date },
    dropoffAddress: {
      type: {
        address: String,
        longitude: String,
        latitude: String,
      }
    },
    droppedOff: Boolean
  },
  { timestamps: true }
);

export const OrderModel = model('Order', OrderSchema, 'Order');
