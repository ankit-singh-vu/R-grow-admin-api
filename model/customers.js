const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let customers = new Schema(
  {
    name: {
      type: String
    },
    age: {
      type: Number
    },
    location: {
      type: String
    }
  },
//   { collection: "Employees" }
);

module.exports = mongoose.model("customers", customers);