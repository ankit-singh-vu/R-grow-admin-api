const mongoose = require("mongoose");
const moment = require("moment");

const masterAdmin = mongoose.Schema(
  {
    username: String,
    name: String,
    password: String,
    email: String,
    role: {
      type: String,
      enum: ["Modaretor", "Admin"],
    },
    status: {
      type: String,
      enum: ["Y", "N", "B"], // Y = Yes, N = NO, B = Blocked
      default: "Y",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

// Virtual for date generation
masterAdmin.virtual("createdOn").get(function () {
  const generateTime = moment(this.createdAt).format("DD-MM-YYYY h:m:ss A");
  return generateTime;
});
masterAdmin.virtual("updatedOn").get(function () {
  const generateTime = moment(this.updatedAt).format("DD-MM-YYYY h:m:ss A");
  return generateTime;
});

module.exports = mongoose.model("Admin", masterAdmin);
