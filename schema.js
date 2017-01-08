const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// define the schema for our user model
var actionSchema = new Schema({
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 24*3600
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


module.exports = actionSchema;
