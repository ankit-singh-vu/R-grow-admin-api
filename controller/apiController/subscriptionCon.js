const AWS = require("aws-sdk");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const tokens = require("../../config/tokens");
const { admin } = require("../../config/fbConfig");
const Retailer = require("../../model/retailer");
const Razorpay = require("razorpay");

let instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SCERET,
});

module.exports = {
  createPlan: async (req, res) => {
    try {
      const params = {
        period: "yearly",
        interval: 1,
        item: {
          name: "gold",
          amount: 2000,
          currency: "INR",
          description: "Basic Plan",
        },
        notes: {
          notes_key_1: "BASIC PLAN",
        },
      };
      instance.plans.create(params).then((plan) => {
        if (plan) {
          return res.status(200).json({ status: "success", plan: plan });
        } else {
          throw new Error("Invalid subscriptions");
        }
        // return res.render('plan', { plan: plan })
      });
    } catch (error) {
      res.status(400).json({ status: "error", error: error.message });
    }
  },

  subscriptions: async (req, res, next) => {
    try {
      // var dt = Date.now();
      var date = new Date();
      var timestamp = date.getTime();

      // var start_date=dt.setDate(dt.getDate() + 15);
      // console.log(dt.setDate(dt.getDate() + 15));
      // console.log(dt.setDate(dt.getDate() + 380));
      var timestamp = Math.round(new Date().getTime() / 1000);
      timestamp += 24 * 60 * 60;
      const params = {
        plan_id: "plan_IBA1c80EieQMB3",
        total_count: 1,
        quantity: 1,
        customer_notify: 1,
        start_at: (Date.now() / 1000) | 0,
        expire_by: timestamp,
        addons: [
          {
            item: {
              name: "GST",
              amount: 1000,
              currency: "INR",
            },
          },
        ],
        notes: {
          notes_key_1: "Tea, Earl Grey, Hot",
          notes_key_2: "Tea, Earl Grey… decaf.",
        },
      };
      instance.subscriptions
        .create(params)
        .then((subscription) => {
          if (subscription) {
            return res
              .status(200)
              .json({ status: "success", subscription: subscription });

            // return res.render('purchase', { subscription: subscription })
          } else {
            throw new Error("Invalid subscriptions");
          }
        })
        .catch((err) => {
          return res.status(400).json({ status: "error", error: err });
        });

      //  const response = instance.subscriptions.create(params).then(subscriptions=>{
      //     res.status(200).json({ status: "Success", subscriptions:subscriptions });

      //  })
    } catch (error) {
      res.status(400).json({ status: "error", error: error.message });
    }
  },
};
