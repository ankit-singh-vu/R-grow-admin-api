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
const Cart = require("../../model/cart");

const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});
module.exports = {
  idTokenVerify: async (req, res) => {
    try {
      const { idToken } = req.body;
      if (idToken && idToken !== "" && idToken !== undefined) {
        admin
          .auth()
          .verifyIdToken(idToken)
          .then((decodedToken) => {
            const uid = decodedToken.uid;
            return res
              .status(200)
              .json({ status: "success", data: decodedToken });
          })
          .catch((error) => {
            return res
              .status(203)
              .json({ status: "error", error: error.message });
          });
      } else {
        return res
          .status(203)
          .json({ status: "error", error: "Sorry! Something went wrong." });
      }
    } catch (error) {
      res.status(400).json({ status: "error", error: error.message });
    }
  },

  getNewTokens: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        let payload = null;
        payload = verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        // console.log(payload);
        if (payload !== null) {
          const whereCon = { id: payload.userId, is_deleted: "0" };
          const checkResult = await dbFunction.fetchData(
            USER_MASTER,
            "",
            "",
            "",
            whereCon
          );
          if (checkResult.length > 0) {
            if (checkResult[0].refresh_token === refreshToken) {
              const accessToken = tokens.createAccessToken(checkResult[0].id);
              const newRefreshToken = tokens.createRefreshToken(
                checkResult[0].id
              );
              const editData = {
                refresh_token: newRefreshToken,
              };
              const updatewhereCon = { id: payload.userId };
              await dbFunction.update(USER_MASTER, editData, updatewhereCon);
              return res.status(200).json({
                status: "success",
                accessToken: `Bearer ${accessToken}`,
                refreshToken: newRefreshToken,
              });
            } else {
              return res
                .status(203)
                .json({ status: "error", message: "Invalid refresh token" });
            }
          } else {
            return res
              .status(203)
              .json({ status: "error", message: "Invalid refresh token" });
          }
        } else {
          return res
            .status(203)
            .json({ status: "error", message: "Invalid refresh token" });
        }
      } else {
        return res
          .status(203)
          .json({ status: "error", message: "Invalid refresh token" });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
  },

  retailerLogin: async (req, res) => {
    try {
      const { phone, password } = req.body;
      if (phone && phone !== "" && password && password !== "") {
        const result = await Retailer.findOne({
          phone,
        });
        // console.log(result);
        if (result) {
          // if (result.status === "A" || result.status === "P") {
          const matchResult = await bcrypt.compare(password, result.password);
          if (matchResult === true) {
            const accesstoken = tokens.createAccessToken(result._id);
            const refreshToken = tokens.createRefreshToken(result._id);
            await Retailer.findByIdAndUpdate(
              result._id,
              {
                refreshToken: refreshToken,
                updatedAt: Date.now(),
              },
              { new: true }
            );
            if (result.profilePic) {
              result.profilePic = await getSignedUrl(result.profilePic);
            }

            const retailerrResult = await Retailer.findOne({
              _id: result._id,
            }).populate("products", "_id productName");
            // .populate("services", "_id serviceCategory");

            return res.status(200).json({
              status: "success",
              data: retailerrResult,
              accessToken: accesstoken,
              refreshToken: refreshToken,
            });
          } else {
            return res.status(400).json({
              status: "error",
              error: "Incorrect Username Or Password.",
            });
          }
          //}
          // else {
          //     return res.status(400).json({ status: 'error', error: "Sorry! account is still pending Or Temporarily blocked by administrator." });
          // }
        } else {
          return res.status(400).json({
            status: "error",
            error: "Sorry! No Retailer's account found.",
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

  editRetailerProfile: async (req, res) => {
    try {
      const {
        retailerName,
        email,
        password,
        addressLine1,
        addressLine2,
        state,
        pincode,
        city,
        userId,
      } = req.body;

      if (userId && userId !== "" && userId !== null && userId !== undefined) {
        const updateData = { updatedAt: Date.now() };
        if (email && email !== "" && email !== undefined && email !== "") {
          const checkUserEmail = await Retailer.findOne({
            $and: [{ _id: { $ne: userId } }, { $or: [{ email: email }] }],
          });
          if (checkUserEmail) {
            return res.status(400).json({
              status: "error",
              error: "Sorry! Email Id already registered.",
            });
          } else {
            updateData["email"] = email;
          }
        }
        if (req.files && req.files.profilePic) {
          const allowType = ["image/png", "image/jpeg", "image/jpg"];
          const uploadedFile = req.files.profilePic;
          updateData["profilePic"] = await fileUpload(
            uploadedFile,
            "profile-pic-" + userId,
            allowType
          );
        }
        if (retailerName && retailerName !== "" && retailerName !== undefined)
          updateData["retailerName"] = retailerName;
        if (password && password !== "" && password !== undefined)
          updateData["password"] = await bcrypt.hash(password, 10);

        if (addressLine1 && addressLine1 !== "" && addressLine1 !== undefined)
          updateData["addressLine1"] = addressLine1;

        if (addressLine2 && addressLine2 !== "" && addressLine2 !== undefined)
          updateData["addressLine2"] = addressLine2;

        if (state && state !== "" && state !== undefined)
          updateData["state"] = state;

        if (pincode && pincode !== "" && pincode !== undefined)
          updateData["pincode"] = pincode;

        if (city && city !== "" && city !== undefined)
          updateData["city"] = city;

        const updateResult = await Retailer.findByIdAndUpdate(
          userId,
          updateData,
          {
            new: true,
          }
        );
        if (updateResult.profilePic) {
          updateResult.profilePic = await getSignedUrl(updateResult.profilePic);
        }
        if (updateResult) {
          return res
            .status(200)
            .json({ status: "success", data: updateResult });
        }
      } else {
        return res
          .status(400)
          .json({ status: "error", error: "Sorry! User Id missing..." });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
  },

  deleteRetailerProfile: async (req, res) => {
    try {
      const phone = req.params.phone;
      if (phone && phone !== "" && phone !== null) {
        const checkUser = await Retailer.find({ $or: [{ phone: phone }] });
        if (checkUser.length) {
          await Retailer.remove(
            {
              phone: phone,
            },
            function (err, Retailer) {
              if (err) return res.send(err);
              return res.status(200).json({ message: "Retailer Deleted" });
            }
          );
        } else {
          return res
            .status(203)
            .json({ status: "error", error: "Retailer Not Found" });
        }
      } else {
        return res
          .status(203)
          .json({ status: "error", error: "Sorry! Something went wrong." });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },

  paymentReceived: async (req, res) => {
    try {
      const { retailerId } = req.body;
      if (retailerId && retailerId !== "") {
        const retailerOrders = await Order.find({
          retailerId: retailerId,
          marked_as_paid: "Yes",
        }).select("_id OrderId amount_paid total_order_selling_price");
        // console.log(retailerOrders);
        return res.status(200).json({
          status: "success",

          data: retailerOrders,
        });
      } else {
        return res
          .status(203)
          .json({ status: "error", message: "Missing Retailer ID" });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
  },

  // getRetailerProducts: async (req, res) => {
  //   try {
  //     const { retailerId, page, size } = req.body;
  //     if (!page) page = 1;
  //     if (!size) size = 10;
  //     const limit = parseInt(size);
  //     const skip = (page - 1) * size;

  //     const retailerProducts = await Products.find(
  //       {
  //         retailerId: retailerId,
  //       },
  //       {
  //         createdAt: -1,
  //       }
  //     )
  //       .limit(limit)
  //       .skip(skip);
  //     console.log(retailerProducts);
  //   } catch (error) {
  //     return res.status(400).json({ status: "error", message: error.message });
  //   }
  // },

  getAllCustomer: async (req, res) => {
    try {
      let { page, size } = req.query;
      if (!page) page = 1;
      if (!size) size = 10;
      const limit = parseInt(size);
      const skip = (page - 1) * size;

      let f = getFiltersRetailer(req);
      const user = await User.find(f.filter, null, {
        sort: { createdAt: f.order },
      })
        .select("-password")
        .limit(limit)
        .skip(skip);

      const total = await User.find(f.filter).countDocuments();
      for (let i = 0; i < user.length; i++) {
        //user profile
        if(user[i].progileImg)
        {
          user[i].progileImg = await getSignedUrl(user[i].progileImg);
        }
      }
      return res.status(200).json({
        status: "success",
        total: total,
        items_returned: user.length,
        page: page,
        size: size,
        data: user,
      });
    } catch (error) {}
  },
  addCustomer: async (req, res) => {
    try {
      const { status, gender, phone, name, email, password } = req.body;
      // const { name,email,phone,password,referalCode } = req.body;
      if (
        name &&
        name !== "" &&
        email &&
        email !== "" &&
        password &&
        password !== "" &&
        phone &&
        phone !== ""
      ) {
        // const checkUser = await User.find({ phone: phone });
        const checkUser = await User.find({
          $or: [{ phone: phone }, { email: email }],
        });
        // console.log(checkUser.length);
        if (checkUser.length === 0) {
          let progileImg = null;
          if (req.files && req.files.profilePic) {
            const allowType = ["image/png", "image/jpeg", "image/jpg"];
            const uploadedFile = req.files.profilePic;
            progileImg = await fileUpload(
              uploadedFile,
              "profile-pic",
              allowType
            );
          }

          const user = new User({
            name: name,
            email: email,
            phone: phone,
            password: await bcrypt.hash(password, 10),
            progileImg: progileImg,
          });
          const result1 = await user.save();
          let result = result1.toObject();
          // delete result.password;
          // console.log(result)
          // delete result.data.password;
          // const accesstoken = tokens.createAccessToken(result._id);
          // const refreshToken = tokens.createRefreshToken(result._id);
          // await User.findByIdAndUpdate(result._id,{
          //     refreshToken: refreshToken,
          //     updatedAt: Date.now()
          // }, {new: true});

          if (result.progileImg) {
            result.progileImg = await getSignedUrl(result.progileImg);
          }
          // res.status(200).json({ status: 'success', data: result, accessToken: accesstoken, refreshToken: refreshToken });
          res.status(200).json({ status: "success", data: result });
        } else {
          return res.status(400).json({
            status: "error",
            error: "Phone number or email already exists",
          });
        }
      } else {
        return res
          .status(400)
          .json({ status: "error", error: "Sorry! Parameter missing." });
      }
    } catch (error) {
      res.status(400).json({ status: "error", error: error.message });
    }
  },
  getCustomerDetails: async (req, res) => {
    try {
      const { CustomerId } = req.params;
      if (
        CustomerId &&
        CustomerId !== "" &&
        CustomerId !== null &&
        CustomerId !== undefined
      ) {
        const user = await User.findById(CustomerId).select("-password");
        return res.status(200).json({ status: "success", data: user });
      } else {
        return res
          .status(400)
          .json({ status: "error", error: "Sorry! Something went wrong" });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
  },

  editCustomer: async (req, res) => {
    try {
      const { status, gender, phone, name, email, password, userId } = req.body;
      // const { name, email, password, userId } = req.body;
      if (userId && userId !== "" && userId !== null && userId !== undefined) {
        const updateData = { updatedAt: Date.now() };
        if (email && email !== "" && email !== undefined && email !== "") {
          const checkUserEmail = await User.findOne({
            $and: [{ _id: { $ne: userId } }, { $or: [{ email: email }] }],
          });
          if (checkUserEmail) {
            return res.status(400).json({
              status: "error",
              error: "Sorry! Email Id already registered.",
            });
          } else {
            updateData["email"] = email;
          }
        }
        if (req.files && req.files.profilePic) {
          const allowType = ["image/png", "image/jpeg", "image/jpg"];
          const uploadedFile = req.files.profilePic;
          updateData["progileImg"] = await fileUpload(
            uploadedFile,
            "profile-pic-" + userId,
            allowType
          );
        }
        if (name && name !== "" && name !== undefined)
          updateData["name"] = name;
        if (phone && phone !== "" && phone !== undefined)
          updateData["phone"] = phone;
        if (gender && gender !== "" && gender !== undefined)
          updateData["gender"] = gender;
        if (status && status !== "" && status !== undefined)
          updateData["status"] = status;
        if (password && password !== "" && password !== undefined)
          updateData["password"] = await bcrypt.hash(password, 10);
        const updateResult = await User.findByIdAndUpdate(userId, updateData, {
          new: true,
        }).select("-password");
        if (updateResult) {
          if (updateResult.progileImg) {
            updateResult.progileImg = await getSignedUrl(
              updateResult.progileImg
            );
          }
          return res
            .status(200)
            .json({ status: "success", data: updateResult });
        }
      } else {
        return res
          .status(400)
          .json({ status: "error", error: "Sorry! Something went wrong" });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
  },
  disableCustomer: async (req, res) => {
    try {
      const { customerId } = req.params;
      if (
        customerId &&
        customerId !== "" &&
        customerId !== null &&
        customerId !== undefined
      ) {
        const updateData = { updatedAt: Date.now() };
        updateData["status"] = "N";
        const updateResult = await User.findByIdAndUpdate(
          customerId,
          updateData,
          {
            new: true,
          }
        ).select("-password");
        if (updateResult) {
          return res
            .status(200)
            .json({ status: "success", data: updateResult });
        }
      } else {
        return res
          .status(400)
          .json({ status: "error", error: "Sorry! Something went wrong" });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
  },

  getOrdersGroup: async (req, res) => {
    try {
      const { OrderNumber } = req.params;
      let order_condition = {};
      order_condition.OrderId = OrderNumber;
      let orders = await Order.findOne(order_condition)
        .populate("orders.product")
        .populate("userId")
        .populate(
          "retailerId",
          "_id retailerName addressLine1 addressLine2 state country email phone"
        )
        .lean();

      for (let i = 0; i < orders.orders.length; i++) {
        for (
          let j = 0;
          j < orders.orders[i].product.productImages.length;
          j++
        ) {
          orders.orders[i].product.productImages[j].image = await getSignedUrl(
            orders.orders[i].product.productImages[j].image
          );
        }
      }

      let invoice_condition = {};
      invoice_condition.orderIdForInv = OrderNumber;
      let invoice = await Invoice.findOne(invoice_condition).lean();
      // console.log(invoice)
      orders.invoice = invoice;
      // console.log(orders.orders)
      // console.log(orders.invoice)
      // console.log(orders.selected_address_id)
      if (
        orders.selected_address_id != null ||
        orders.selected_address_id != ""
      ) {
        let c_address = await Address.findOne({
          _id: orders.selected_address_id,
        }).lean();
        //   console.log(c_address)
        orders.userId.selected_address = c_address;
      }
      return res.status(200).json({ status: "success", data: orders });
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },
  getOrderDetails: async (req, res) => {
    try {
      let filter = {};
      let { page, size } = req.query;
      if (!page) page = 1;
      if (!size) size = 10;
      const limit = parseInt(size);
      const skip = (page - 1) * size;

      // console.log(req.query)
      if (req.query.order_status) {
        filter.order_status = req.query.order_status;
      }

      if (req.query.retailerId) filter.retailerId = req.query.retailerId;
      if (req.query.OrderId)
        filter.OrderId = { $regex: req.query.OrderId, $options: "i" };

      let order;
      order = -1; //desc
      if (req.query.order) order = req.query.order;
      // console.log(filter)
      var f = {
        filter: filter,
        order: order,
      };

      let orders = await Order.find(f.filter)
        .populate("orders.product")
        .populate("userId", "name")
        .populate("retailerId", "retailerName")
        .sort({ updatedAt: f.order })
        .limit(limit)
        .skip(skip)

        .lean();

      let total = await Order.find(f.filter).countDocuments();

      return res.status(200).json({
        status: "success",
        total: total,
        items_returned: orders.length,
        page: page,
        size: size,
        data: orders,
      });
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },
  getOrders: async (req, res) => {
    try {
      const { CustomerId } = req.params;
      let condition = {};
      condition.userId = CustomerId;
      let orders = await Order.find(condition)
        .populate("orders.product")
        .populate("retailerId")
        .sort({ createdAt: -1 })
        .lean();

      let orders_product_wise = [];
      for (let i = 0; i < orders.length; i++) {
        for (let j = 0; j < orders[i].orders.length; j++) {
          let ob = {};
          ob = orders[i].orders[j];
          ob.OrderNumber = orders[i].OrderId;
          console.log(ob.OrderNumber);
          // let invoice =null;
          // invoice = await Invoice.find({orderIdForInv:ob.OrderNumber})
          // ob.invoice=invoice;

          ob.retailer = orders[i].retailerId.retailerName;

          orders_product_wise.push(ob);
        }
      }

      return res.status(200).json({
        status: "success",
        items_returned: orders_product_wise.length,
        data: orders_product_wise,
      });
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },

  getOrderSummary: async (req, res) => {
    try {
      const { CustomerId } = req.params;
      if (
        CustomerId &&
        CustomerId !== "" &&
        CustomerId !== null &&
        CustomerId !== undefined
      ) {
        let condition = {};
        condition.userId = CustomerId;

        let total_order = 0,
          order_value = 0,
          cancelled_order = 0,
          completed_order = 0;
        total_order = await Order.find(condition).countDocuments();

        condition.order_status = "completed";
        completed_order = await Order.find(condition).countDocuments();

        // condition.order_status="cancelled_by_customer"
        condition.order_status = "cancelled_by_retailer";
        cancelled_order = await Order.find(condition).countDocuments();

        condition.order_status = "completed";
        let completed_order_data = await Order.find(condition);

        let sum = 0;
        for (let i = 0; i < completed_order_data.length; i++) {
          sum = sum + Number(completed_order_data[i].amount_to_pay);
        }
        order_value = sum;
        let data = {
          total_order,
          order_value,
          cancelled_order,
          completed_order,
        };
        return res.status(200).json({ status: "success", data: data });
      } else {
        return res
          .status(400)
          .json({ status: "error", error: "Sorry! Something went wrong" });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
  },
  getSubscriptions: async (req, res) => {
    try {
      let { page, size } = req.query;
      if (!page) page = 1;
      if (!size) size = 10;
      const limit = parseInt(size);
      const skip = (page - 1) * size;
      const subscriptions = await Retailer.find({
        subscription_id: { $ne: null },
      });
      const allSubscriptions = await Retailer.find({
        subscription_id: { $ne: null },
      })
        .select(
          "_id retailerName phone subscription_status plan_name plan_id subscription_id charge_at start_at expire_by"
        )
        .limit(limit)
        .skip(skip);

      return res.status(200).json({
        status: "success",
        total: subscriptions.length,
        page_count:
          subscriptions.length % size == 0
            ? subscriptions.length / size
            : parseInt(subscriptions.length / size + 1, 10),
        items_returned: allSubscriptions.length,
        page: page,
        size: size,

        data: allSubscriptions,
      });
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },

  
  getOrderDetails: async (req, res) => {
    try {
      let filter = {};
      let { page, size } = req.query;
      if (!page) page = 1;
      if (!size) size = 10;
      const limit = parseInt(size);
      const skip = (page - 1) * size;

      // console.log(req.query)
      if (req.query.order_status){
        filter.order_status = req.query.order_status
      }
      if (req.query.userId)
        filter.userId = req.query.userId
      if (req.query.retailerId)
        filter.retailerId = req.query.retailerId
      if (req.query.OrderId)
        filter.OrderId = { $regex: req.query.OrderId, $options: "i" };

      let order;
      order = -1; //desc
      if (req.query.order) order = req.query.order;
      // console.log(filter)
      var f = {
        filter: filter,
        order: order,
      };
      
      
      let orders = await Order.find(f.filter)
        .populate("orders.product")
        .populate("userId","name")
        .populate(
          "retailerId",
          "retailerName"
        )
        .sort({updatedAt:f.order})
        .limit(limit)
        .skip(skip)
        .lean();

      

      let total = await Order.find(f.filter).countDocuments();


      return res.status(200).json({
        status: "success",
        total: total,
        items_returned: orders.length,
        page: page,
        size: size,
        data: orders,
      });

    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },

  getcart: async (req, res) => {

    try {
        let retailerproducts;
        let  filter={}
        let query=req.query;
        console.log(query)

        filter.userId=query.userId
        filter.is_save_for_later=query.is_save_for_later
        filter.is_delete=0

        retailerproducts = await Cart.find(filter,null, {sort: {createdAt: -1}})
        .populate("retailerId","retailerName")
        .populate("productId")



        for (let i = 0; i < retailerproducts.length; i++) {
            //products images
            for (let j = 0; j < retailerproducts[i].productId.productImages.length; j++) {
                retailerproducts[i].productId.productImages[j].image = await getSignedUrl(
                  retailerproducts[i].productId.productImages[j].image
                );
            }                
        }

        return res
          .status(200)
          .json({ status: "success", items_returned:retailerproducts.length, data: retailerproducts });
   
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },

  getOrders: async (req, res) => {
    try {
        const {
            CustomerId
          } = req.params;
          let condition={}
          condition.userId=CustomerId
        let orders = await Order.find(condition)
        .populate("orders.product")
        .populate("retailerId")
        .sort({createdAt:-1})
        .lean();

        let orders_product_wise=[];
        for (let i = 0; i < orders.length; i++) {
            
            for (let j = 0; j < orders[i].orders.length; j++) {
                let ob={}
                ob=orders[i].orders[j]
                ob.OrderNumber=orders[i].OrderId
                console.log(ob.OrderNumber);
                // let invoice =null;
                // invoice = await Invoice.find({orderIdForInv:ob.OrderNumber})
                // ob.invoice=invoice;

                ob.retailer=orders[i].retailerId.retailerName

                orders_product_wise.push(ob)

                
            }
        }
      
        return res
          .status(200)
          .json({ status: "success", items_returned:orders_product_wise.length, data: orders_product_wise });
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  }, 

  getCustomerAdresssList: async (req, res) => {
    try {
        const {
            CustomerId
          } = req.params;

        if (CustomerId && CustomerId !== "") {
            const address = await Address.find({ CustomerId: CustomerId });
            return res
            .status(200)
            .json({ status: "success", data: address });
        }
        else{
            return res
            .status(400)
            .json({ status: "error", error: "Customer Id  missing" });
        }
    } catch (error) {
        return res.status(400).json({ status: "error", error: error.message });
    }
},    

  getInvoiceList: async (req, res) => {
    const { CustomerId } = req.params;
    try {
      const invoice = await Invoice.find({
        userId: CustomerId
      })
        .populate({
          path: "orderId",
          populate: {
            path: "orders.product",
          },
        })
        .populate("userId")
        .populate(
          "retailerId",
          "_id retailerName addressLine1 addressLine2 state country email phone"
        );


      if(invoice.length>0){
        return res.status(200).json({
            status: "success",
            invoice: invoice,
          });
      }
      else
      {
        return res.status(400).json({ status: "error", error: "Invoice not Generated" });
      }



    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },    

  getCustomerDetails: async (req, res) => {
    try {
        const { CustomerId } = req.params;
        if(CustomerId && (CustomerId !== "") && (CustomerId !== null) && (CustomerId !== undefined)){
            const user = await User.findById(CustomerId).select("-password");
            return res.status(200).json({ status: 'success', data: user });
        }else{
            return res.status(400).json({ status: 'error', error: "Sorry! Something went wrong" });
        }
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
  },  

  
  getOrderSummary: async (req, res) => {
    try {
        const { CustomerId } = req.params;
        if(CustomerId && (CustomerId !== "") && (CustomerId !== null) && (CustomerId !== undefined)){
          let condition={}
          condition.userId=CustomerId

          let 
          total_order=0,
          order_value=0,
          cancelled_order=0,
          completed_order=0
          ;

          total_order = await Order.find(condition).countDocuments()

          condition.order_status="completed"
          completed_order = await Order.find(condition).countDocuments()

          // condition.order_status="cancelled_by_customer"
          condition.order_status="cancelled_by_retailer"
          cancelled_order = await Order.find(condition).countDocuments()  
          
          condition.order_status="completed"
          let completed_order_data = await Order.find(condition)

          let sum=0;
          for (let i = 0; i < completed_order_data.length; i++) {
            sum = sum+ Number(completed_order_data[i].amount_to_pay);
          }
          order_value=sum
          let data={
            total_order,
            order_value,
            cancelled_order,
            completed_order
          }
            return res.status(200).json({ status: 'success', data: data });
        }else{
            return res.status(400).json({ status: 'error', error: "Sorry! Something went wrong" });
        }
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
  }, 
  //reviews-----------------------------
  addReviews: async (req, res) => {
    try {
      const {
        rate,
        review,
        reviewOfId,
        reviewbyId,
        reviewOftype,
        reviewBytype,
      } = req.body;
      if (reviewOfId && reviewOfId !== "") {
        const rating = new Rating({
          rate: rate,
          review: review,
          reviewOfId: reviewOfId,
          reviewbyId: reviewbyId,
          reviewOftype: reviewOftype,
          reviewBytype: reviewBytype,
        });
        const result1 = await rating.save();

        //----------------update avg rating and reviews count code left-------
        // let condition={}
        // condition.reviewOfId=reviewOfId
        // let previous_rating = await Product.find(condition).countDocuments();
        // // console.log(previous_rating)
        // previous_rating.rate

        // let updateData = { updatedAt: Date.now() };
        // updateData['rating_avg'] = 1;

        // const updateResult = await Cart.findByIdAndUpdate(cartItemid,updateData, {new: true})

        return res.status(200).json({ status: "success", data: result1 });
        // .json({ status: "success",data: previous_rating })
      } else {
        return res
          .status(400)
          .json({ status: "error", error: "Sorry! Parameter missing." });
      }
    } catch (error) {
      res.status(400).json({ status: "error", error: error.message });
    }
  },

  getReviews: async (req, res) => {
    try {
      const { reviewOfId } = req.params;
      let condition = {};
      condition.reviewOfId = reviewOfId;
      let rating = await Rating.find(condition).lean();
      //done only for customer , retailer left
      for (let i = 0; i < rating.length; i++) {
        rating[i].reviewby = await User.findById(rating[i].reviewbyId).select(
          "name"
        );
      }
      total = await Rating.find().countDocuments();

      return res.status(200).json({
        status: "success",
        total: total,
        items_returned: rating.length,
        data: rating,
      });
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },
  addStoreLocation: async (req, res) => {
    try {
      const { longitude, latitude, retailerId } = req.body;
      if (retailerId && retailerId !== "") {
        if (longitude && longitude !== "" && latitude && latitude !== "") {
          const addStoreLocation = await Retailer.findByIdAndUpdate(
            { _id: retailerId },
            {
              $set: {
                storeLocation: {
                  type: "Point",
                  coordinates: [parseFloat(latitude), parseFloat(longitude)],
                },
              },
            },
            (err, updateDetails) => {
              if (err) {
                console.log(err);
                return res.send(err);
              }
              if (updateDetails) {
                //Get updated location
                Retailer.findOne(
                  {
                    _id: retailerId,
                  },
                  (error, updateLocation) => {
                    if (error) {
                      return res.status(400).send(error);
                    }
                    return res.status(200).send(updateLocation);
                  }
                );
              }
            }
          );
        } else {
          return res
            .status(400)
            .json({ status: "error", error: "latitude or longitude missing" });
        }
      } else {
        return res
          .status(400)
          .json({ status: "error", error: "retailerId missing" });
      }
    } catch (error) {
      return res.status(400).send(error);
    }
  },

  findNearbyStores: async (req, res) => {
    try {
      const { latitude, longitude, userId } = req.body;
      if (latitude && latitude !== "" && longitude && longitude !== "") {
        const stores = await Retailer.find({
          storeLocation: {
            $near: {
              $maxDistance: 5000,
              $geometry: {
                type: "Point",
                coordinates: [parseFloat(latitude), parseFloat(longitude)],
              },
            },
          },
        });
        if (stores) {
          return res.status(200).json({ status: "Success", data: stores });
        } else {
          return res
            .status(404)
            .json({ status: "Success", message: "No nearby stores available" });
        }
      }
    } catch (error) {
      return res.status(400).send(error);
    }
  },
  getcart: async (req, res) => {
    try {
      let retailerproducts;
      let filter = {};
      let query = req.query;
      console.log(query);

      filter.userId = query.userId;
      filter.is_save_for_later = query.is_save_for_later;
      filter.is_delete = 0;

      retailerproducts = await Cart.find(filter, null, {
        sort: { createdAt: -1 },
      })
        .populate("retailerId", "retailerName")
        .populate("productId");

      for (let i = 0; i < retailerproducts.length; i++) {
        //products images
        for (
          let j = 0;
          j < retailerproducts[i].productId.productImages.length;
          j++
        ) {
          retailerproducts[i].productId.productImages[j].image =
            await getSignedUrl(
              retailerproducts[i].productId.productImages[j].image
            );
        }
      }

      return res.status(200).json({
        status: "success",
        items_returned: retailerproducts.length,
        data: retailerproducts,
      });
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },
  getCustomerAdresssList: async (req, res) => {
    try {
      const { CustomerId } = req.params;

      if (CustomerId && CustomerId !== "") {
        const address = await Address.find({ CustomerId: CustomerId });
        return res.status(200).json({ status: "success", data: address });
      } else {
        return res
          .status(400)
          .json({ status: "error", error: "Customer Id  missing" });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },
};

async function getSignedUrl(keyName) {
  try {
    const s3 = new AWS.S3({
      signatureVersion: "v4",
      accessKeyId: process.env.ACCESS_KEY_ID,
      secretAccessKey: process.env.SECRET_ACCESS_KEY,
    });
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: keyName,
    };

    const headCode = await s3.headObject(params).promise();
    if (headCode) {
      const signedUrl = s3.getSignedUrl("getObject", params);
      return signedUrl;
    } else {
      throw new Error("Sorry! File not found 1");
    }
  } catch (error) {
    if (error.code === "NotFound" || error.code === "Forbidden") {
      // throw new Error('Sorry! File not found 2')
      return keyName;
    }
  }
}

async function fileUpload(requestFile, fileName, allowType) {
  try {
    return new Promise(function (resolve, reject) {
      const uploadedFile = requestFile;
      if (allowType.includes(uploadedFile.mimetype)) {
        let uploadedFileName = uploadedFile.name;
        const filenameSplit = uploadedFileName.split(".");
        const fileExtension = filenameSplit[filenameSplit.length - 1];
        uploadedFileName =
          fileName.toLowerCase().replace(" ", "-") +
          "-" +
          Date.now() +
          "." +
          fileExtension;
        fs.readFile(uploadedFile.tempFilePath, (err, uploadedData) => {
          const params = {
            Bucket: process.env.BUCKET_NAME,
            Key: "images/" + uploadedFileName, // File name you want to save as in S3
            Body: uploadedData,
          };
          s3.upload(params, async (err, data) => {
            if (err) {
              return reject("Sorry! File upload failed. " + err.message);
            } else {
              resolve(data.Key);
            }
          });
        });
      } else {
        return reject("Sorry! Invalid File.");
      }
    });
  } catch (error) {
    return reject(error.message);
  }
}

function getFiltersRetailer(req) {
  let filter = {};
  // console.log(req.query)
  if (req.query.retailerName)
    filter.retailerName = { $regex: req.query.retailerName, $options: "i" };
  if (req.query.phone)
    filter.phone = { $regex: req.query.phone, $options: "i" };
  if (req.query.email)
    filter.email = { $regex: req.query.email, $options: "i" };
  if (req.query.city) filter.city = { $regex: req.query.city, $options: "i" };
  if (req.query.website)
    filter.website = { $regex: req.query.website, $options: "i" };
  if (req.query.state)
    filter.state = { $regex: req.query.state, $options: "i" };

  // filter.status=1;

  let order;
  order = -1; //desc
  if (req.query.order) order = req.query.order;
  // console.log(filter)
  var f = {
    filter: filter,
    order: order,
  };
  return f;
}
