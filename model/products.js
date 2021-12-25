const mongoose = require("mongoose");
const moment = require("moment");

const products = mongoose.Schema(
  {
    productName: { type: String, required: true },
    description: { type: String, required: true },
    // productCategory: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Product_category",
    // },
    productCategory: { type: String, required: true },
    hsnNumber: { type: String, required: true },
    price: { type: String, required: true },
    quantity: { type: String, required: true },
    profitMargin: {
      type: String,
      default: null,
    },
    totalTaxableAmount: { type: String, default: null },
    discount: { type: String, default: null },
    totalAmount: { type: String, required: true },
    productImages: [
      {
        name: String,
        image: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: "rgrow_retailer" },
    rating_avg: { type: String, default: "0" },
    reviews_count: { type: Number, default: 0 },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Products", products);
