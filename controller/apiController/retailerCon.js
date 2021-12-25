const AWS = require("aws-sdk");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const tokens = require("../../config/tokens");
const { admin } = require("../../config/fbConfig");
const Retailer = require("../../model/retailer");
const Admin = require("../../model/admin");
const User = require("../../model/users"); //customer
const Invoice = require("../../model/invoice");
const Address = require("../../model/customer_address");
const mongoose = require("mongoose");
const moment = require("moment");
const { parse } = require("path");
const Product = require("../../model/products");
const Orders = require("../../model/orders");
const orders = require("../../model/orders");
const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});
module.exports = {
  addRetailer: async (req, res) => {
    try {
      const {
        retailerName,
        addressLine1,
        addressLine2,
        state,
        pincode,
        country,
        email,
        phone,
        city,
        password,
        website,
        profilePic,
        gstnNumber,
      } = req.body;
      if (
        retailerName &&
        retailerName !== "" &&
        addressLine1 &&
        addressLine1 !== "" &&
        addressLine2 &&
        addressLine2 !== "" &&
        state &&
        state !== "" &&
        pincode &&
        pincode !== "" &&
        country &&
        country !== "" &&
        email &&
        email !== "" &&
        phone &&
        phone !== "" &&
        city &&
        city !== "" &&
        password &&
        password !== ""
      ) {
        const checkRetailer = await Retailer.find({
          phone,
        });
        if (checkRetailer.length === 0) {
          const retailerUser = new Retailer({
            retailerName,
            addressLine1,
            addressLine2,
            state,
            pincode,
            country,
            phone,
            email,
            city,
            password: await bcrypt.hash(password, 10),
            website,
            profilePic,
            gstnNumber,
          });
          const result = await retailerUser.save();

          const accessToken = tokens.createAccessToken(result._id);
          const refreshToken = tokens.createRefreshToken(result._id);
          await Retailer.findByIdAndUpdate(
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
            // accessToken: accessToken,
            // refreshToken: refreshToken,
          });
        } else {
          return res.status(400).json({
            status: "error",
            error: "Retailer's Phone or Email ID already exists",
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
  getRetailerInfo: async (req, res) => {
    try {
      const { retailerId } = req.params;
      // console.log(retailerId);
      if (retailerId && retailerId !== "") {
        const retailer = await Retailer.findById({
          _id: retailerId,
        }).select(
          "retailerName addressLine1 addressLine2 state pincode country phone email city"
        );

        if (retailer.profilePic) {
          retailer.profilePic = await getSignedUrl(retailer.profilePic);
        }
        let retailersSuccessOrder = await Orders.aggregate([
          {
            $match: {
              retailerId: new mongoose.Types.ObjectId(retailerId),
              order_status: "completed",
            },
          },
          {
            $group: {
              _id: null,
              total_order_selling: {
                $sum: { $toInt: "$total_order_selling_price" },
              },
              orderCount: {
                $sum: 1,
              },
              total_order_cost: {
                $sum: { $toInt: "$total_order_cost_price" },
              },
            },
          },
          // {{ retailerId: retailer_id }, { order_status: "completed" }}
        ]);
        const data = {
          orderCount: retailersSuccessOrder.length
            ? retailersSuccessOrder[0].orderCount
            : 0,
          total_order_selling: retailersSuccessOrder.length
            ? retailersSuccessOrder[0].total_order_selling
            : 0,
          total_order_cost: retailersSuccessOrder.length
            ? retailersSuccessOrder[0].total_order_cost
            : 0,
          revenue:
            (retailersSuccessOrder.length
              ? retailersSuccessOrder[0].total_order_selling
              : 0) -
            (retailersSuccessOrder.length
              ? retailersSuccessOrder[0].total_order_cost
              : 0),
        };

        // console.log(retailersSuccessOrder);
        return res.status(200).json({
          status: "success",
          data: retailer,
          salesData: data,
        });
      } else {
        return res
          .status(400)
          .json({ status: "error", error: "Product Id missing" });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },
  getAllRetailer: async (req, res) => {
    try {
      let { page, size } = req.query;
      if (!page) page = 1;
      if (!size) size = 10;
      const limit = parseInt(size);
      const skip = (page - 1) * size;

      let f = getFiltersRetailer(req);
      const retailer = await Retailer.find(f.filter, null, {
        sort: { createdAt: f.order },
      })
        .select("-password -services -products")
        .limit(limit)
        .skip(skip);

      const total = await Retailer.find(f.filter).countDocuments();
      for (let i = 0; i < retailer.length; i++) {
        //retailer profile
        if (retailer[i].profilePic) {
          retailer[i].profilePic = await getSignedUrl(retailer[i].profilePic);
        }
      }
      return res.status(200).json({
        status: "success",
        total: total,
        items_returned: retailer.length,
        page: page,
        size: size,
        data: retailer,
      });
    } catch (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
  },

  searchRetailer: async (req, res) => {
    try {
      const { key } = req.query;
      if (key != null) {
        let userPattern = new RegExp(key, "i");

        searchRetailer = await Retailer.find({
          $or: [
            { retailerName: { $regex: userPattern } },
            { phone: { $regex: userPattern } },
          ],
        });

        if (searchRetailer) {
          return res.status(200).json({
            status: "success",
            data: searchRetailer,
          });
        } else {
          return res
            .status(204)
            .json({ status: "success", message: "No Results found" });
        }
      }
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },

  addProduct: async (req, res) => {
    try {
      const {
        productName,
        description,
        productCategory,
        hsnNumber,
        price,
        quantity,
        profitMargin,
        totalTaxableAmount,
        discount,
        gstValue,
        totalAmount,
        productImages,
        retailerId,
      } = req.body;
      // console.log();
      if (
        productName &&
        productName !== "" &&
        description &&
        description !== "" &&
        // req.files.productImages.length &&
        productCategory &&
        productCategory !== "" &&
        retailerId &&
        retailerId !== "" &&
        hsnNumber &&
        hsnNumber !== "" &&
        price &&
        price !== "" &&
        quantity &&
        quantity !== "" &&
        totalAmount &&
        totalAmount !== ""
      ) {
        var add_limit = 0;

        const checkReatiler = await Retailer.findById({
          _id: retailerId,
        });

        if (checkReatiler.plan_name === "Gold") {
          add_limit = 100;
        }
        if (checkReatiler.plan_name === "Silver") {
          add_limit = 200;
        }
        if (checkReatiler.plan_name === "Basic") {
          add_limit = 300;
        }

        // return 0;
        // if (checkReatiler) {
        if (checkReatiler.plan_name === "Platinum") {
          const product = new Product({
            productName,
            description,
            productCategory,
            hsnNumber,
            price,
            quantity,
            profitMargin,
            discount,
            totalTaxableAmount,
            totalAmount,
            retailerId,
          });
          const data = await product.save();
          const reatilerById = await Retailer.findById(retailerId);
          reatilerById.products.push(product);
          await reatilerById.save();
          if (req.files && data) {
            const allowType = ["image/png", "image/jpeg", "image/jpg"];
            if (req.files.productImages) {
              const imagesFiles = req.files.productImages;
              if (imagesFiles.length === undefined) {
                const uploadResult = await fileUpload(
                  imagesFiles,
                  imagesFiles.name.substr(imagesFiles.name.length) +
                    retailerId.substr(retailerId.length - 4),
                  allowType
                );

                const updatedData = await Product.findByIdAndUpdate(
                  data._id,
                  {
                    $push: {
                      productImages: {
                        name: imagesFiles.name,
                        // image: await getSignedUrl(uploadResult),
                        image: uploadResult,
                      },
                    },
                  },
                  { new: true }
                );
                const Data = await Product.findById(data._id);
                return res.status(200).json({
                  status: "success",
                  data: Data,
                  message: "Product added successfully",
                });
              }
              // **bug:- if single file upload then imagesFiles.length showing undefined
              for (let i = 0; i < imagesFiles.length; i++) {
                const uploadedFile = imagesFiles[i];

                const uploadResult = await fileUpload(
                  uploadedFile,
                  productName + retailerId.substr(retailerId.length - 4),
                  allowType
                );

                const updatedData = await Product.findByIdAndUpdate(
                  data._id,
                  {
                    $push: {
                      productImages: {
                        name: uploadedFile.name,
                        // image: await getSignedUrl(uploadResult),
                        image: uploadResult,
                      },
                    },
                  },
                  { new: true }
                );
              }
            }
          }
          const updatedData = await Product.findById(data._id);
          return res.status(200).json({
            status: "success",
            data: updatedData,
            message: "Product added successfully",
          });
        } else {
          const productCount = await Product.find({
            retailerId: retailerId,
          }).countDocuments();
          if (productCount < add_limit) {
            const product = new Product({
              productName,
              description,
              productCategory,
              hsnNumber,
              price,
              quantity,
              profitMargin,
              discount,
              totalTaxableAmount,
              totalAmount,
              retailerId,
            });
            const data = await product.save();
            const reatilerById = await Retailer.findById(retailerId);
            reatilerById.products.push(product);
            await reatilerById.save();
            if (req.files && data) {
              const allowType = ["image/png", "image/jpeg", "image/jpg"];
              if (req.files.productImages) {
                const imagesFiles = req.files.productImages;
                if (imagesFiles.length === undefined) {
                  const uploadResult = await fileUpload(
                    imagesFiles,
                    imagesFiles.name.substr(imagesFiles.name.length) +
                      retailerId.substr(retailerId.length - 4),
                    allowType
                  );

                  const updatedData = await Product.findByIdAndUpdate(
                    data._id,
                    {
                      $push: {
                        productImages: {
                          name: imagesFiles.name,
                          // image: await getSignedUrl(uploadResult),
                          image: uploadResult,
                        },
                      },
                    },
                    { new: true }
                  );
                  const Data = await Product.findById(data._id);
                  return res.status(200).json({
                    status: "success",
                    data: Data,
                    message: "Product added successfully",
                  });
                }
                // **bug:- if single file upload then imagesFiles.length showing undefined
                for (let i = 0; i < imagesFiles.length; i++) {
                  const uploadedFile = imagesFiles[i];

                  const uploadResult = await fileUpload(
                    uploadedFile,
                    productName + retailerId.substr(retailerId.length - 4),
                    allowType
                  );

                  const updatedData = await Product.findByIdAndUpdate(
                    data._id,
                    {
                      $push: {
                        productImages: {
                          name: uploadedFile.name,
                          // image: await getSignedUrl(uploadResult),
                          image: uploadResult,
                        },
                      },
                    },
                    { new: true }
                  );
                }
              }
            }
            const updatedData = await Product.findById(data._id);
            return res.status(200).json({
              status: "success",
              data: updatedData,
              message: "Product added successfully",
            });
          } else {
            return res.status(404).json({
              status: "error",
              error: "Product Add Limit Exceed for your plan",
            });
          }
        }
      }
      // }
      else {
        return res
          .status(203)
          .json({ status: "error", error: "Missing Something" });
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({ status: "error", error: error.message });
    }
  },
  distnictProducts: async (req, res) => {
    try {
      const distnictId = await Product.find().distinct("retailerId");
      console.log(distnictId);
    } catch (error) {}
  },
  getRetailerProducts: async (req, res) => {
    try {
      const { retailerId, page, size } = req.body;
      // let { page, size } = req.query;
      if (!page) page = 1;
      if (!size) size = 10;
      const limit = parseInt(size);
      const skip = (page - 1) * size;

      if (retailerId && retailerId !== "") {
        const retailerproducts = await Product.find({ retailerId });
        const retailerproductsFilter = await Product.find({ retailerId })
          .limit(limit)
          .skip(skip);

        // const total = await Product.find({ retailerId }).countDocuments();

        for (let i = 0; i < retailerproductsFilter.length; i++) {
          for (
            let j = 0;
            j < retailerproductsFilter[i].productImages.length;
            j++
          ) {
            retailerproductsFilter[i].productImages[j].image =
              await getSignedUrl(
                retailerproductsFilter[i].productImages[j].image
              );
          }
        }

        return res.status(200).json({
          status: "success",
          total: retailerproducts.length,
          page_count:
            retailerproducts.length % size == 0
              ? retailerproducts.length / size
              : parseInt(retailerproducts.length / size + 1, 10),
          items_returned: retailerproductsFilter.length,
          page: page,
          size: size,
          data: retailerproductsFilter,
        });
      } else {
        return res
          .status(400)
          .json({ status: "error", error: "Retailer Id missing" });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },
  editProduct: async (req, res) => {
    try {
      const {
        productName,
        description,
        productCategory,
        hsnNumber,
        price,
        discount,
        profitMargin,
        quantity,
        gstValue,
        totalTaxableAmount,
        totalAmount,
        retailerId,
        productId,
      } = req.body;

      if (
        retailerId &&
        retailerId !== "" &&
        retailerId !== null &&
        retailerId !== undefined &&
        productId &&
        productId !== "" &&
        productId !== null &&
        productId !== undefined
      ) {
        const checkProduct = await Product.findOne({
          $and: [{ _id: productId }, { retailerId: retailerId }],
        });
        if (checkProduct) {
          const updateData = { updatedAt: Date.now() };

          if (productName && productName !== "" && productName !== undefined)
            updateData["productName"] = productName;
          if (description && description !== "" && description !== undefined)
            updateData["description"] = description;

          if (
            productCategory &&
            productCategory !== "" &&
            productCategory !== undefined
          )
            updateData["productCategory"] = productCategory;

          if (hsnNumber && hsnNumber !== "" && hsnNumber !== undefined)
            updateData["hsnNumber"] = hsnNumber;

          if (discount && discount !== "" && discount !== undefined)
            updateData["discount"] = discount;

          if (profitMargin && profitMargin !== "" && profitMargin !== undefined)
            updateData["profitMargin"] = profitMargin;

          if (price && price !== "" && price !== undefined)
            updateData["price"] = price;

          if (quantity && quantity !== "" && quantity !== undefined)
            updateData["quantity"] = quantity;

          if (gstValue && gstValue !== "" && gstValue !== undefined)
            updateData["gstValue"] = gstValue;

          if (
            totalTaxableAmount &&
            totalTaxableAmount !== "" &&
            totalTaxableAmount !== undefined
          )
            updateData["totalTaxableAmount"] = totalTaxableAmount;

          if (totalAmount && totalAmount !== "" && totalAmount !== undefined)
            updateData["totalAmount"] = totalAmount;

          const updateResult = await Product.findByIdAndUpdate(
            productId,
            updateData,
            {
              new: true,
            }
          );

          if (req.files && updateResult) {
            const allowType = ["image/png", "image/jpeg", "image/jpg"];
            if (req.files.productImages) {
              const imagesFiles = req.files.productImages;
              // console.log(imagesFiles.length);
              if (imagesFiles.length === undefined) {
                const uploadResult = await fileUpload(
                  imagesFiles,
                  imagesFiles.name.substr(imagesFiles.name.length) +
                    retailerId.substr(retailerId.length - 4),
                  allowType
                );

                const updatedData = await Product.findByIdAndUpdate(
                  updateResult._id,
                  {
                    $push: {
                      productImages: {
                        name: imagesFiles.name,
                        // image: await getSignedUrl(uploadResult),
                        image: uploadResult,
                      },
                    },
                  },
                  { new: true }
                );
                // console.log(data._id);
                const Data = await Product.findById(updateResult._id);
                // console.log(Data);
                return res.status(200).json({
                  status: "success",
                  data: Data,
                  message: "Product added successfully",
                });
              }
              // **bug:- if single file upload then imagesFiles.length showing undefined
              for (let i = 0; i < imagesFiles.length; i++) {
                const uploadedFile = imagesFiles[i];

                const uploadResult = await fileUpload(
                  uploadedFile,
                  productName + retailerId.substr(retailerId.length - 4),
                  allowType
                );

                const updatedData = await Product.findByIdAndUpdate(
                  updateResult._id,
                  {
                    $push: {
                      productImages: {
                        name: uploadedFile.name,
                        // image: await getSignedUrl(uploadResult),
                        image: uploadResult,
                      },
                    },
                  },
                  { new: true }
                );
              }
            }
          }
          const updatedData = await Product.findById(updateResult._id);
          // console.log(updateData);
          return res.status(200).json({ status: "success", data: updatedData }); // if (updateResult.profilePic) {
          //   updateResult.profilePic = await getSignedUrl(updateResult.profilePic);
          // }
        } else {
          return res.status(400).json({
            status: "error",
            error:
              "Sorry! No product found with given retailerId and productId",
          });
        }
      } else {
        return res.status(400).json({
          status: "error",
          error: "Sorry! Reatiler Id or Product Id missing...",
        });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const { productId } = req.params;
      if (productId && productId !== "") {
        const retailerProduct = await Product.findByIdAndDelete({
          _id: productId,
        });

        await Retailer.findByIdAndUpdate(retailerProduct.retailerId, {
          $pull: {
            products: productId,
          },
        });

        return res
          .status(200)
          .json({ status: "success", message: "Product deleted" });
      }
      {
        return res
          .status(400)
          .json({ status: "error", error: "Product Id missing" });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },
  recentBookings: async (req, res) => {
    try {
      const { retailerId } = req.body;
      if (retailerId && retailerId !== "") {
        const retailerOrders = await Orders.find({
          retailerId: retailerId,
          // marked_as_paid: "Yes",
        })
          .populate("userId", "_id name")
          .select("OrderId amount_to_pay order_status createdAt");
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
  earningsData: async (req, res) => {
    try {
      const { retailerId } = req.body;
      if (retailerId && retailerId !== "") {
        let retailersOrder = await Orders.aggregate([
          {
            $match: {
              retailerId: new mongoose.Types.ObjectId(retailerId),
            },
          },
          {
            $group: {
              _id: null,
              total_order_selling: {
                $sum: { $toInt: "$total_order_selling_price" },
              },
              orderCount: {
                $sum: 1,
              },
              total_order_cost: {
                $sum: { $toInt: "$total_order_cost_price" },
              },
            },
          },
          // {{ retailerId: retailer_id }, { order_status: "completed" }}
        ]);
        let retailersSuccessOrder = await Orders.aggregate([
          {
            $match: {
              retailerId: new mongoose.Types.ObjectId(retailerId),
              order_status: "completed",
            },
          },
          {
            $group: {
              _id: null,
              total_order_selling: {
                $sum: { $toInt: "$total_order_selling_price" },
              },
              orderCount: {
                $sum: 1,
              },
              total_order_cost: {
                $sum: { $toInt: "$total_order_cost_price" },
              },
            },
          },
          // {{ retailerId: retailer_id }, { order_status: "completed" }}
        ]);
        const data = {
          totalOrderReceipts: retailersOrder.length
            ? retailersOrder[0].orderCount
            : 0,
          total_order_selling: retailersOrder.length
            ? retailersOrder[0].total_order_selling
            : 0,
          total_order_cost: retailersOrder.length
            ? retailersOrder[0].total_order_cost
            : 0,

          totalCompletedOrders: retailersSuccessOrder.length
            ? retailersSuccessOrder[0].orderCount
            : 0,
          total_order_selling_completed: retailersSuccessOrder.length
            ? retailersSuccessOrder[0].total_order_selling
            : 0,
          total_order_cost_completed: retailersSuccessOrder.length
            ? retailersSuccessOrder[0].total_order_cost
            : 0,
        };
        res.status(200).json({ status: "success", data: data });
      } else {
        return res
          .status(400)
          .json({ status: "error", message: error.message });
      }
    } catch (error) {}
  },
};
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
