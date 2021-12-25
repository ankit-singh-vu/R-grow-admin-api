const admin = require('firebase-admin');

const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: "YOUR DATABASE URL"
// });

module.exports = admin;

// https://www.youtube.com/watch?v=L3I7t_4nUEU
// https://codingshiksha.com/javascript/node-js-express-firebase-admin-sdk-server-side-authentication-in-javascript-full-project/
// https://stackoverflow.com/questions/52184020/firebase-phone-authentication-using-nodejs