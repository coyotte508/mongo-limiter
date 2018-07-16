import {Schema, Document} from 'mongoose';

// define the schema for our user model
export default new Schema({
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 24 * 3600
  },
  user: {
    type: String,
    index: true
  },
  action: {
    type: String,
  },
  data: Schema.Types.Mixed
});

export interface ActionLogDocument extends Document {
  createdAt: Date;
  user: string;
  action: string;
  data: any;
}
