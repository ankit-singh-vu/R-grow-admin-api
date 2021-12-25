const AWS = require('aws-sdk');
const fs = require('fs');
module.exports = {

    fileUploadDemo: async (req, res) => {
        try {
            const s3 = new AWS.S3({
                accessKeyId: process.env.ACCESS_KEY_ID,
                secretAccessKey: process.env.SECRET_ACCESS_KEY
            });
            const uploadedFile = req.files.profile_pic;
            fs.readFile(uploadedFile.tempFilePath, (err, uploadedData) => {
                const params = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: "images/logo.jpg", // File name you want to save as in S3
                    Body: uploadedData 
                };
                s3.upload(params, function(err, data) {
                    console.log("error",err);
                    console.log("success", data);
                    if (err) {
                        throw err;
                    }
                    res.send({
                        "response_code": 200,
                        "response_message": "Success",
                        "response_data": data
                    });
                });

            })

            // const fileContent  = Buffer.from(req.files.profile_pic.data, 'binary');
            // // Setting up S3 upload parameters
            // const params = {
            //     Bucket: process.env.BUCKET_NAME,
            //     Key: "images/profile.jpg", // File name you want to save as in S3
            //     Body: fileContent 
            // };

            // // Uploading files to the bucket
            // s3.upload(params, function(err, data) {
            //     console.log("error",err);
            //     console.log("success", data);
            //     if (err) {
            //         throw err;
            //     }
            //     res.send({
            //         "response_code": 200,
            //         "response_message": "Success",
            //         "response_data": data
            //     });
            // });

            // success {
            //     ETag: '"d41d8cd98f00b204e9800998ecf8427e"',
            //     Location: 'https://rideoo-driver-test.s3.amazonaws.com/images/test.jpg',
            //     key: 'images/test.jpg',
            //     Key: 'images/test.jpg',
            //     Bucket: 'rideoo-driver-test'
            // }

            // success {
            //     ETag: '"d41d8cd98f00b204e9800998ecf8427e"',
            //     Location: 'https://rideoo-driver-test.s3.amazonaws.com/images/profile.jpg',
            //     key: 'images/profile.jpg',
            //     Key: 'images/profile.jpg',
            //     Bucket: 'rideoo-driver-test'
            // }





            /*let imageName = "";
            if(req.files){
                const allowType = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
                const destination = 'public/images/uploads/car/';
                if(req.files.image_file){
                    const uploadResult = await fileUpload(req.files.image_file,name,allowType,destination);
                    if((uploadResult) && (uploadResult !== "")){
                        imageName = uploadResult;
                    }else{
                        return res.status(203).json({ status:'error', error: "Sorry! File upload failed." });
                    }
                }
            } else {
                return res.status(203).json({ status:'error', error: "Sorry! Please upload a file." });
            }
            const car = new CarCategory({
                name: name,
                image: ((imageName !== "")?imageName:null)
            });
            const data = await car.save();
            res.status(200).json({ status:'success', data: data });*/
        } catch (error) {
            res.status(400).json({ status:'error', error: error.message });
        }
    },

    getFileFromBucket: async (req, res) => {
        try {
            const getUrl = await getSignedUrl("images/logo.jpg");
            res.status(200).json({status: "success", data: getUrl});
        } catch (error) {
            res.status(400).json({status: "error", error: error.message});
        }
        // const s3 = new AWS.S3({
        //     signatureVersion: 'v4',
        //     accessKeyId: process.env.ACCESS_KEY_ID,
        //     secretAccessKey: process.env.SECRET_ACCESS_KEY
        // });
        // const params = {
        //     Bucket: process.env.BUCKET_NAME,
        //     Key: "images/logo.jpg", 
        // };

        // try { 
        //     const headCode = await s3.headObject(params).promise();
        //     console.log("headcode", headCode)
        //     const signedUrl = s3.getSignedUrl('getObject', params);
        //     console.log("signedurl", signedUrl);
        //     let image="<img src='"+signedUrl+"'/>";
        //     let startHTML="<html><body>";
        //     let endHTML="</body></html>";
        //     let html=startHTML + image + endHTML;
        //     res.send(html);
        //     // res.send("Success");
        //     // Do something with signedUrl
        // } catch (headErr) {
        //     // console.log(headErr);
        //     if (headErr.code === 'NotFound' || headErr.code === 'Forbidden') {
        //         console.log("not found");
        //         res.send("Not found");
        //         // Handle no object on cloud here  
        //     }
        // }
    }
}

function encode(data){
    let buf = Buffer.from(data);
    let base64 = buf.toString('base64');
    console.log(base64);
    return base64
}

async function fileUpload(requestFile,fileName,allowType,destination){
    try {
        const uploadedFile = requestFile;
        if(allowType.includes(uploadedFile.mimetype)) {
            let uploadedFileName = uploadedFile.name;
            const filenameSplit = uploadedFileName.split('.');
            const fileExtension = filenameSplit[filenameSplit.length-1];
            uploadedFileName = fileName.toLowerCase().replace(" ", "-") +'-'+ Date.now()+ '.' + fileExtension;
            // await uploadedFile.mv(destination + uploadedFileName);
            return uploadedFileName;
        }else{
            throw new Error('Sorry! Invalid File.')
            // throw {status: 'error', message: 'Sorry! Invalid File.'};
        }
    } catch (error) {
        throw new Error(error)
    }
    
}

async function getSignedUrl(keyName){
    try {
        const s3 = new AWS.S3({
            signatureVersion: 'v4',
            accessKeyId: process.env.ACCESS_KEY_ID,
            secretAccessKey: process.env.SECRET_ACCESS_KEY
        });
        const params = {
            Bucket: process.env.BUCKET_NAME,
            Key: keyName
        };
        
        const headCode = await s3.headObject(params).promise();
        if(headCode){
            const signedUrl = s3.getSignedUrl('getObject', params);
            return signedUrl;
        }else{
            throw new Error('Sorry! File not found 1')
            
        }
    } catch (error) {
        if (error.code === 'NotFound' || error.code === 'Forbidden') {
            // throw new Error('Sorry! File not found 2')
            return keyName;

        }
    }
    
}