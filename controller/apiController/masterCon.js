const AWS = require("aws-sdk");
// const Driver = require("../../model/drivers");
const Retailer = require("../../model/retailer");
const Product = require("../../model/products");
const Service = require("../../model/service");

const ProductCategory = require("../../model/productCategory");
const fs = require("fs");

const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});
module.exports = {
  checkPhoneNo: async (req, res) => {
    try {
      const phoneNo = req.params.phone;
      if (phoneNo && phoneNo !== "" && phoneNo !== null) {
        const checkUser = await Retailer.find({ $or: [{ phone: phoneNo }] });
        console.log(checkUser);
        if (checkUser.length === 0) {
          res.status(200).json({
            status: "success",
            message: "No retailer registered with this number",
          });
        } else {
          res
            .status(203)
            .json({ status: "error", error: "Already registered" });
        }
      } else {
        res
          .status(203)
          .json({ status: "error", error: "Sorry! Something went wrong." });
      }
    } catch (error) {
      res.status(400).json({ status: "error", error: error.message });
    }
  },
  addCategory: async (req, res) => {
    try {
      const { name } = req.body;
      // let imageName = "";
      // let signedImage = "";
      // if (req.files) {
      //   const allowType = ["image/png", "image/jpeg", "image/jpg"];
      //   if (req.files.image_file) {
      //     const uploadedFile = req.files.image_file;
      //     imageName = await fileUpload(uploadedFile, name, allowType);
      //     // signedImage = await getSignedUrl(imageName);
      //   }
      // }
      const category = new ProductCategory({
        name: name,
        // image: imageName !== "" ? imageName : null,
      });
      await category.save();
      return res
        .status(200)
        .json({ status: "success", message: "Category added successfully" });
    } catch (error) {
      return res.status(400).json({ status: "error", error: error });
    }
  },
  allProducts: async (req, res) => {
    try {
      let { page, size } = req.query;
      if (!page) page = 1;
      if (!size) size = 10;
      const limit = parseInt(size);
      const skip = (page - 1) * size;
      const Products = await Product.find();
      const allProducts = await Product.find()
        .populate("retailerId", "_id retailerName")
        .limit(limit)
        .skip(skip);
      for (let i = 0; i < allProducts.length; i++) {
        for (let j = 0; j < allProducts[i].productImages.length; j++) {
          allProducts[i].productImages[j].image = await getSignedUrl(
            allProducts[i].productImages[j].image
          );
        }
      }

      return res.status(200).json({
        status: "success",
        total: Products.length,
        page_count:
          Products.length % size == 0
            ? Products.length / size
            : parseInt(Products.length / size + 1, 10),
        items_returned: allProducts.length,
        page: page,
        size: size,
        data: allProducts,
      });
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },

  getProduct: async (req, res) => {
    try {
      const { productId } = req.params;
      if (productId && productId !== "") {
        const retailerproducts = await Product.findById({ _id: productId });
        for (let j = 0; j < retailerproducts.productImages.length; j++) {
          retailerproducts.productImages[j].image = await getSignedUrl(
            retailerproducts.productImages[j].image
          );
        }

        return res
          .status(200)
          .json({ status: "success", data: retailerproducts });
      } else {
        return res
          .status(400)
          .json({ status: "error", error: "Product Id missing" });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },

  getSameProducts: async (req, res) => {
    try {
      const { productName } = req.body;
      if (productName) {
        const sameProducts = await Product.find({
          productName: new RegExp(`^${productName}$`, "i"),
        }).populate("retailerId", "_id retailerName");
        // console.log(sameProducts);
        return res.status(200).json({ status: "success", data: sameProducts });
      } else {
        return res
          .status(400)
          .json({ status: "error", error: "Product Name missing" });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },

  getLatestProducts: async (req, res) => {
    try {
      const { retailer_id } = req.body;
      if (retailer_id && retailer_id !== "") {
        const latestProducts = await Product.find({
          retailerId: retailer_id,
        })
          .sort({ _id: -1 })
          .limit(10);
        if (latestProducts === null) {
          res.status(200).json({
            status: "success",
            message: "No Latest product Found",
          });
        } else {
          res
            .status(200)
            .json({ status: "success", latestProducts: latestProducts });
        }
      } else {
        res.status(203).json({ status: "error", error: "retailerId missing" });
      }
    } catch (error) {
      res.status(400).json({ status: "error", error: error.message });
    }
  },

  latestProducts: async (req, res) => {
    try {
      const latestProducts = await Product.find().sort({ _id: -1 }).limit(10);
      if (latestProducts === null) {
        res.status(200).json({
          status: "success",
          message: "No Latest Product Found",
        });
      } else {
        res
          .status(200)
          .json({ status: "success", latestProducts: latestProducts });
      }
    } catch (error) {
      res.status(400).json({ status: "error", error: error.message });
    }
  },

  //Services
  addServices: async (req, res) => {
    try {
      const {
        description,
        serviceName,
        hourlyRate,
        experience,
        hsnNumber,
        availibility,
        timeSlot,
        retailerId,
      } = req.body;
      if (
        description &&
        description !== "" &&
        serviceName &&
        serviceName !== "" &&
        retailerId &&
        retailerId !== "" &&
        hourlyRate &&
        hourlyRate !== "" &&
        experience &&
        experience !== "" &&
        hsnNumber &&
        hsnNumber !== "" &&
        availibility &&
        availibility !== "" &&
        timeSlot
      ) {
        // const checkReatiler = await Retailer.findOne({
        //   retailerId,
        // });
        // if (checkReatiler) {
        const service = new Service({
          description,
          serviceName,
          hourlyRate,
          experience,
          hsnNumber,
          availibility,
          timeSlot,
          retailerId,
        });
        // console.log(service);
        const data = await service.save();
        // console.log(data);
        const reatilerById = await Retailer.findById(retailerId);
        // console.log(reatilerById);
        reatilerById.services.push(service);
        await reatilerById.save();

        if (req.files && data) {
          const allowType = ["image/png", "image/jpeg", "image/jpg"];
          if (req.files.serviceImages) {
            const imagesFiles = req.files.serviceImages;
            if (imagesFiles.length === undefined) {
              const uploadResult = await fileUpload(
                imagesFiles,
                imagesFiles.name.substr(imagesFiles.name.length) +
                  retailerId.substr(retailerId.length - 4),
                allowType
              );
              const updatedData = await Service.findByIdAndUpdate(
                data._id,
                {
                  $push: {
                    serviceImages: {
                      name: imagesFiles.name,
                      // image: await getSignedUrl(uploadResult),
                      image: uploadResult,
                    },
                  },
                },
                { new: true }
              );
              const Data = await Service.findById(data._id);
              return res.status(200).json({
                status: "success",
                data: Data,
                message: "Service added successfully",
              });
            }

            for (let i = 0; i < imagesFiles.length; i++) {
              const uploadedFile = imagesFiles[i];
              const uploadResult = await fileUpload(
                uploadedFile,
                uploadedFile.name.substr(uploadedFile.name.length) +
                  retailerId.substr(retailerId.length - 4),
                allowType
              );
              // console.log(uploadResult);
              const updatedData = await Service.findByIdAndUpdate(
                data._id,
                {
                  $push: {
                    serviceImages: {
                      name: uploadedFile.name,
                      // image: await getSignedUrl(uploadResult),
                      image: uploadResult,
                    },
                  },
                },
                { new: true }
              );
              // console.log(updatedData);
            }
          }
        }
        // console.log(updatedData);
        const updatedData = await Service.findById(data._id);
        return res.status(200).json({
          status: "success",
          data: updatedData,
          message: "Service added successfully",
        });
      }
      // }
      else {
        return res.status(203).json({
          status: "error",
          error: "Sorry! Something  misssing",
        });
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({ status: "error", error: error.message });
    }
  },

  getServices: async (req, res) => {
    try {
      const { retailerId } = req.params;
      let { page, size } = req.query;
      if (!page) page = 1;
      if (!size) size = 10;
      const limit = parseInt(size);
      const skip = (page - 1) * size;

      if (retailerId && retailerId !== "") {
        const retailerServices = await Service.find({ retailerId })
          .limit(limit)
          .skip(skip);

        const total = await Service.find({ retailerId }).countDocuments();

        for (let i = 0; i < retailerServices.length; i++) {
          for (let j = 0; j < retailerServices[i].serviceImages.length; j++) {
            retailerServices[i].serviceImages[j].image = await getSignedUrl(
              retailerServices[i].serviceImages[j].image
            );
          }
        }
        return res.status(200).json({
          status: "success",
          total: total,
          items_returned: retailerServices.length,
          page: page,
          size: size,
          data: retailerServices,
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

  editService: async (req, res) => {
    try {
      const {
        description,
        serviceName,
        hourlyRate,
        experience,
        hsnNumber,
        availibility,
        timeSlot,
        retailerId,
        serviceImages,
        serviceId,
      } = req.body;

      if (
        retailerId &&
        retailerId !== "" &&
        retailerId !== null &&
        retailerId !== undefined &&
        serviceId &&
        serviceId !== "" &&
        serviceId !== null &&
        serviceId !== undefined
      ) {
        const checkService = await Service.findOne({
          $and: [{ _id: serviceId }, { retailerId: retailerId }],
        });

        if (checkService) {
          const updateData = { updatedAt: Date.now() };

          if (description && description !== "" && description !== undefined)
            updateData["description"] = description;

          if (serviceName && serviceName !== "" && serviceName !== undefined)
            updateData["serviceName"] = serviceName;

          if (hsnNumber && hsnNumber !== "" && hsnNumber !== undefined)
            updateData["hsnNumber"] = hsnNumber;

          if (hourlyRate && hourlyRate !== "" && hourlyRate !== undefined)
            updateData["hourlyRate"] = hourlyRate;

          if (experience && experience !== "" && experience !== undefined)
            updateData["experience"] = experience;

          if (availibility && availibility !== "" && availibility !== undefined)
            updateData["availibility"] = availibility;

          if (timeSlot && timeSlot !== "" && timeSlot !== undefined)
            updateData["timeSlot"] = timeSlot;

          const updateResult = await Service.findByIdAndUpdate(
            serviceId,
            updateData,
            {
              new: true,
            }
          );

          if (req.files && updateResult) {
            const allowType = ["image/png", "image/jpeg", "image/jpg"];
            if (req.files.serviceImages) {
              const imagesFiles = req.files.serviceImages;
              // console.log(imagesFiles.length);
              if (imagesFiles.length === undefined) {
                const uploadResult = await fileUpload(
                  imagesFiles,
                  imagesFiles.name.substr(imagesFiles.name.length) +
                    retailerId.substr(retailerId.length - 4),
                  allowType
                );
                const updatedData = await Service.findByIdAndUpdate(
                  updateResult._id,
                  {
                    $push: {
                      serviceImages: {
                        name: imagesFiles.name,
                        // image: await getSignedUrl(uploadResult),
                        image: uploadResult,
                      },
                    },
                  },
                  { new: true }
                );
                const Data = await Service.findById(updateResult._id);
                return res.status(200).json({
                  status: "success",
                  data: Data,
                  message: "Service added successfully",
                });
              }
              // **bug:- if single file upload then imagesFiles.length showing undefined
              for (let i = 0; i < imagesFiles.length; i++) {
                const uploadedFile = imagesFiles[i];
                // console.log(uploadedFile);

                const uploadResult = await fileUpload(
                  uploadedFile,
                  uploadedFile.name.substr(uploadedFile.name.length) +
                    retailerId.substr(retailerId.length - 4),
                  allowType
                );

                const updatedData = await Service.findByIdAndUpdate(
                  updateResult._id,
                  {
                    $push: {
                      serviceImages: {
                        name: uploadedFile.name,
                        // image: await getSignedUrl(uploadResult),
                        image: uploadResult,
                      },
                    },
                  },
                  { new: true }
                );
                // if (updatedData) {
                //   return res
                //     .status(200)
                //     .json({ status: "success", data: updatedData });
                // }
              }
            }
          }
          const updatedData = await Service.findById(updateResult._id);

          return res.status(200).json({ status: "success", data: updatedData }); // if (updateResult.profilePic) {
          //   updateResult.profilePic = await getSignedUrl(updateResult.profilePic);
          // }
        } else {
          return res.status(400).json({
            status: "error",
            error:
              "Sorry! No Service found with given retailerId and productId",
          });
        }
      } else {
        return res.status(400).json({
          status: "error",
          error: "Sorry! Reatiler Id or Service Id missing...",
        });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
  },

  getService: async (req, res) => {
    try {
      const { serviceId } = req.params;
      if (serviceId && serviceId !== "") {
        const retailerService = await Service.findById({ _id: serviceId });
        for (let j = 0; j < retailerService.serviceImages.length; j++) {
          retailerService.serviceImages[j].image = await getSignedUrl(
            retailerService.serviceImages[j].image
          );
        }

        return res
          .status(200)
          .json({ status: "success", data: retailerService });
      }
      {
        return res
          .status(400)
          .json({ status: "error", error: "Service Id missing" });
      }
    } catch (error) {
      return res.status(400).json({ status: "error", error: error.message });
    }
  },
  deleteService: async (req, res) => {
    try {
      const { serviceId } = req.params;
      if (serviceId && serviceId !== "") {
        const retailerService = await Service.findByIdAndDelete({
          _id: serviceId,
        });

        await Retailer.findByIdAndUpdate(retailerService.retailerId, {
          $pull: {
            services: serviceId,
          },
        });

        return res
          .status(200)
          .json({ status: "success", message: "Service deleted" });
      }
      {
        return res
          .status(400)
          .json({ status: "error", error: "Service Id missing" });
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
