const AWS = require("aws-sdk");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const tokens = require("../../config/tokens");
const { admin } = require("../../config/fbConfig");
const Retailer = require("../../model/retailer");
const Admin = require("../../model/admin");
const User = require("../../model/users"); //customer
const Order = require("../../model/orders");
const Invoice = require("../../model/invoice");
const Address = require("../../model/customer_address");
const mongoose = require("mongoose");
const moment = require("moment");
const { parse } = require("path");
const Products = require("../../model/products");
const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});
module.exports = {
  adminRegistration: async (req, res) => {
    try {
      const { username, name, password, email, role } = req.body;
      if (username && username !== "" && password && password !== "") {
        const checkAdmin = await Admin.find({
          username,
        });
        if (checkAdmin.length === 0) {
          const admin = new Admin({
            username,
            password: await bcrypt.hash(password, 10),
          });
          const result = await admin.save();
          const accessToken = tokens.createAccessToken(result._id);
          const refreshToken = tokens.createRefreshToken(result._id);
          await Admin.findByIdAndUpdate(
            result._id,
            {
              refreshToken: refreshToken,
              updatedAt: Date.now(),
            },
            { new: true }
          );
          return res.status(200).json({
            status: "success",
            data: result,
            accessToken: accessToken,
            refreshToken: refreshToken,
          });
        } else {
          return res.status(400).json({
            status: "error",
            error: "Username",
          });
        }
      } else {
        return res.status(400).json({
          status: "error",
          error: "Sorry! Parameter missing.",
        });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },
  adminLogin: async (req, res) => {
    try {
      6;
      const { username, password } = req.body;
      if (username && username !== "" && password && password !== "") {
        const result = await Admin.findOne({
          username,
        });
        if (result) {
          // if (result.status === "A" || result.status === "P") {
          const matchResult = await bcrypt.compare(password, result.password);
          if (matchResult === true) {
            const accesstoken = tokens.createAccessToken(result._id);
            const refreshToken = tokens.createRefreshToken(result._id);
            const admin = await Admin.findByIdAndUpdate(
              result._id,
              {
                refreshToken: refreshToken,
                updatedAt: Date.now(),
              },
              { new: true }
            );
            return res.status(200).json({
              status: "success",
              data: admin,
              accessToken: accesstoken,
              refreshToken: refreshToken,
            });
          } else {
            return res.status(400).json({
              status: "error",
              error: "Incorrect Username Or Password.",
            });
          }
        } else {
          return res.status(400).json({
            status: "error",
            error: "Sorry! No Admin account found.",
          });
        }
      } else {
        return res.status(400).json({
          status: "error",
          error:
            "Sorry! Please provide registered Email ID/Phone No and Password",
        });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },
};
