const express = require("express");
const router = express.Router();
const { apiAuthAdmin } = require("../config/authentication");
const indexCon = require("../controller/apiController/indexCon");
const masterCon = require("../controller/apiController/masterCon");
const orderConf = require("../controller/apiController/orderConf");
const admin = require("../model/admin");
const retailerCon = require("../controller/apiController/retailerCon");
const adminCon = require("../controller/apiController/adminCon");

// const subscriptionCon = require("../controller/apiController/subscriptionCon");

// const testCon = require('../controller/apiController/testCon');

////////////// Firebase idToken verify /////////
router.post("/fbToken-verify", indexCon.idTokenVerify);
// admin
router.post("/adminRegistration", adminCon.adminRegistration);
router.post("/adminLogin", adminCon.adminLogin);
// Retailer
router.post("/add-retailer", apiAuthAdmin, retailerCon.addRetailer);
// router.post("/getRetailerDetails", indexCon.addRetailer);
// router.post("/retailerLogin", indexCon.retailerLogin);
// router.patch(
//   "/retailer-edit-profile",
//   apiAuthAdmin,
//   indexCon.editRetailerProfile
// );
router.get(
  "/get-retailer-info/:retailerId",
  apiAuthAdmin,
  retailerCon.getRetailerInfo
);
router.get("/allretailer", apiAuthAdmin, retailerCon.getAllRetailer);
router.get("/searchRetailer", apiAuthAdmin, retailerCon.searchRetailer); //pg-1

router.patch("/addStoreLocation", indexCon.addStoreLocation);
router.delete("/delete-retailer/:phone", indexCon.deleteRetailerProfile);

//Customer
router.get("/allcustomer", apiAuthAdmin, indexCon.getAllCustomer); //pg-9
router.post("/add-customer", apiAuthAdmin, indexCon.addCustomer); //pg-15
router.patch("/edit-customer", apiAuthAdmin, indexCon.editCustomer);
router.patch(
  "/disable-customer/:customerId",
  apiAuthAdmin,
  indexCon.disableCustomer
); //pg-11
router.get(
  "/get-customer-details/:CustomerId",
  apiAuthAdmin,
  indexCon.getCustomerDetails
);

//reviews
router.get("/get-reviews/:reviewOfId", apiAuthAdmin, indexCon.getReviews); //pg-22
router.post("/add-reviews", apiAuthAdmin, indexCon.addReviews);

//Product
// router.post("/add-product-category", masterCon.addCategory);
router.post("/retailer-add-product", apiAuthAdmin, retailerCon.addProduct);
// router.get("/distnict", masterCon.distnictProducts);

router.post(
  "/retailer-product-list",
  apiAuthAdmin,
  retailerCon.getRetailerProducts
);
router.get("/get-product/:productId", apiAuthAdmin, masterCon.getProduct);
router.post("/getLatestProducts", apiAuthAdmin, masterCon.getLatestProducts);
router.get("/allProducts", apiAuthAdmin, masterCon.allProducts);
router.post("/getSameProducts", apiAuthAdmin, masterCon.getSameProducts);

router.patch("/update-product", apiAuthAdmin, retailerCon.editProduct);
router.delete(
  "/delete-product/:productId",
  apiAuthAdmin,
  retailerCon.deleteProduct
);
router.post("/paymentReceived", apiAuthAdmin, indexCon.paymentReceived);
router.post("/recentBookings", apiAuthAdmin, retailerCon.recentBookings);
router.post("/earningsData", apiAuthAdmin, retailerCon.earningsData);

//Orders
router.post(
  "/latestOrdersRetailer",
  apiAuthAdmin,
  orderConf.latestOrdersRetailer
);
router.get("/latestOrders", apiAuthAdmin, orderConf.latestOrders);
router.get("/allOrders", apiAuthAdmin, orderConf.allOrders);
router.post("/productOrders", apiAuthAdmin, orderConf.productOrders);
router.get("/order-group/:OrderNumber", apiAuthAdmin, indexCon.getOrdersGroup); //pg-13
router.get("/order-details-list", indexCon.getOrderDetails); //pg-12
router.get("/order-list/:CustomerId", apiAuthAdmin, indexCon.getOrders); //pg-11
router.get(
  "/get-order-summary/:CustomerId",
  apiAuthAdmin,
  indexCon.getOrderSummary
);

//subscriptions
router.get("/getSubscriptions", apiAuthAdmin, indexCon.getSubscriptions); //pg-12

//Service
// router.post("/add-product-category", masterCon.addCategory);
router.post("/retailer-add-service", masterCon.addServices);
router.get("/service-list/:retailerId", masterCon.getServices);
router.get("/get-service/:serviceId", masterCon.getService);
router.patch("/update-service", masterCon.editService);
router.delete("/delete-service/:serviceId", masterCon.deleteService);
//cart
router.get("/cart-list", apiAuthAdmin, indexCon.getcart); //pg-11

// address
router.get(
  "/get-adresss-list/:CustomerId",
  apiAuthAdmin,
  indexCon.getCustomerAdresssList
); //pg-11

//subscription
// router.post("/plan", subscriptionCon.createPlan);
// router.post("/subscriptions", subscriptionCon.subscriptions);

//Nearest storerss
router.post("/findNearbyStores", indexCon.findNearbyStores);

router.post("/get-new-token", indexCon.getNewTokens);

router.get("/phone-no-check-retailer/:phone", masterCon.checkPhoneNo);

// router.post('/file-upload-test', testCon.fileUploadDemo);
// router.get('/get-file', testCon.getFileFromBucket);

router.get("*", async (req, res) => {
  res.status(404).json({
    status: "error",
    message: "Sorry! API your are looking for has not been found",
  });
});
router.post("*", async (req, res) => {
  res.status(404).json({
    status: "error",
    message: "Sorry! API your are looking for has not been found",
  });
});

module.exports = router;
