const AWS = require("aws-sdk");
// const Driver = require("../../model/drivers");
const Retailer = require("../../model/retailer");
const Product = require("../../model/products");
const Service = require("../../model/service");

const ProductCategory = require("../../model/productCategory");
const fs = require("fs");
const Orders = require("../../model/orders");

const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});
module.exports = {
  latestOrdersRetailer: async (req, res) => {
    try {
      const { retailer_id } = req.body;
      if (retailer_id && retailer_id !== "") {
        const retailersOrder = await Orders.find({
          $and: [{ retailerId: retailer_id }, { order_status: "pending" }],
        })
          .populate("userId")
          .sort({ _id: -1 })
          .limit(10);
        if (retailersOrder === null) {
          res.status(200).json({
            status: "success",
            message: "No New Orders Found",
          });
        } else {
          res
            .status(200)
            .json({ status: "success", allOrders: retailersOrder });
        }
      } else {
        res.status(203).json({ status: "error", error: "retailerId missing" });
      }
    } catch (error) {
      res.status(400).json({ status: "error", error: error.message });
    }
  },
  latestOrders: async (req, res) => {
    try {
      const retailersOrder = await Orders.find({
        order_status: "pending",
      })
        .populate("userId")
        .sort({ _id: -1 })
        .limit(10);
      if (retailersOrder === null) {
        res.status(200).json({
          status: "success",
          message: "No New Orders Found",
        });
      } else {
        res.status(200).json({ status: "success", allOrders: retailersOrder });
      }
    } catch (error) {
      res.status(400).json({ status: "error", error: error.message });
    }
  },

  allOrders: async (req, res) => {
    try {
      let { page, size } = req.query;
      if (!page) page = 1;
      if (!size) size = 10;
      const limit = parseInt(size);
      const skip = (page - 1) * size;

      const allOrders = await Orders.find().limit(limit).skip();
    } catch (error) {
      res.status(400).json({ status: "error", error: error.message });
    }
  },

  productOrders: async (req, res) => {
    try {
      const productOrders = await Orders.find();
      res.status(400).json({ status: "success", data: productOrders });
    } catch (error) {}
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
