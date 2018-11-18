const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({dest:'./public/uploads/', storage: storage });
const fs = require('fs');
const request = require('request');
const Datastore = require('@google-cloud/datastore');
const moment = require('moment');
const subscriptionKey = process.env.MS_SUBSCRIPTION_KEY;
const projectId = 'face-validate'; // Your Google Cloud Platform project ID

function calcAge(DOB) {
    return moment().diff(DOB, 'years');
}

router.get('/', function (req, res, next) {
    // Creates a client
    var datastore = new Datastore({
        projectId: projectId
    });

    var votersQuery = datastore
        .createQuery('Register')
        .order('VIN', {
            descending: false,
        });

    var voters, voterList = [];
    datastore.runQuery(votersQuery).then(results => {
        voters = results[0];
        voters.forEach(voter => {
            voterList.push({ fullname: voter['Full name'], id: voter.VIN, age: calcAge(voter.DOB), gender: (voter.Gender === 'F') ? 'Female': 'Male' });
        });
        res.render('verifyVoter', { title: 'Verify Voter', voters: voterList });
    }).catch((err) => {
        res.render('error', err);
    });    
});

function detectFace(uploadedFileBinary) {
    const uriBase = 'https://westus.api.cognitive.microsoft.com/face/v1.0/detect';
    const scannedImageBuffer = uploadedFileBinary;

    // Request parameters.
    const params = {
        'returnFaceId': 'true',
        'returnFaceLandmarks': 'false',
        'returnFaceAttributes': 'age,gender,headPose,smile,facialHair,glasses,' +
            'emotion,makeup,occlusion,accessories'
    };
    
    const options = {
        uri: uriBase,
        qs: params,
        body: scannedImageBuffer,
        headers: {
            'Content-Type': 'application/octet-stream',
            'Ocp-Apim-Subscription-Key' : subscriptionKey
        }
    };

    return new Promise(resolve => {
        request.post(options, (error, response, body) => {
            let faceData;
            let apiDataJSON = JSON.parse(body);
    
            if (error) {
              console.log('Error: ', error);
              return;
            }
    
            if (apiDataJSON.length > 0) {
                faceData = {
                    faceDetected: true,
                    faceId: apiDataJSON[0].faceId,
                    age: apiDataJSON[0].faceAttributes.age,
                    gender: apiDataJSON[0].faceAttributes.gender,
                    hasGlasses: !(apiDataJSON[0].faceAttributes.glasses === 'NoGlasses'),
                    facialHair: (apiDataJSON[0].faceAttributes.facialHair.beard > 0.3),
                    makeup: (apiDataJSON[0].faceAttributes.makeup.eyeMakeup || apiDataJSON[0].faceAttributes.makeup.lipMakeup),
                    fearFactor: apiDataJSON[0].faceAttributes.emotion.fear,
                    scannedImageBuffer
                }
            } else {
                faceData = {
                    faceDetected: false
                };
            }
    
            resolve(faceData);
        });
    })
}

function verifyFaces(regVoterFaceIdObj, scannedVoterFaceIdObj) {
    const uriBase = 'https://westus.api.cognitive.microsoft.com/face/v1.0/verify';

    const requestBody = {
        faceId1: regVoterFaceIdObj.faceId,
        faceId2: scannedVoterFaceIdObj.faceId
    };
    
    const options = {
        uri: uriBase,
        body: JSON.stringify(requestBody),
        headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key' : subscriptionKey
        }
    };
    
    return new Promise(resolve => {
        request.post(options, (error, response, body) => {
            let verificationData;
            let apiDataJSON = JSON.parse(body);
    
            if (error) {
              console.log('Error: ', error);
              return;
            }

            if (!apiDataJSON.hasOwnProperty('error')) {
                verificationData = {
                    canVerify: true,
                    isIdentical: apiDataJSON.isIdentical,
                    scannedPerson: {
                        age: scannedVoterFaceIdObj.age,
                        gender: scannedVoterFaceIdObj.gender,
                        fearFactor: scannedVoterFaceIdObj.fearFactor,
                        hasGlasses: scannedVoterFaceIdObj.hasGlasses,
                        imgBuffer: scannedVoterFaceIdObj.scannedImageBuffer
                    },
                    confidence: parseInt(apiDataJSON.confidence * 100, 10) +'%'
                };
            } else {
                verificationData = {
                    canVerify: false
                };
            }
            
            resolve(verificationData);
        });
    })
}

router.post('/', upload.single('voter-image'), function (req, res) {
    const regVoterBioArray = req.body['reg-voter-bio'].split(';'); 
    const regVoterId = regVoterBioArray[0];
    const regVoterFullname = regVoterBioArray[1];
    const regVoterAge = parseInt(regVoterBioArray[2], 10);
    const regVoterGender = regVoterBioArray[3];

    const readFile = (path, opts = {}) =>
    new Promise((resolve, reject) => {
        fs.readFile(path, opts, (err, data) => {
            if (err) reject(err)
            else resolve(data)
        })
    }); 

    async function doVerification() {
        const regVoterImageBuffer = await readFile('./public/images/registered-voters/'+ regVoterId +'.jpeg');
        const regVoterFaceIdObj = await detectFace(regVoterImageBuffer);
        const scannedVoterFaceIdObj = await detectFace(req.file.buffer);

        return await verifyFaces(regVoterFaceIdObj, scannedVoterFaceIdObj);
    }

    doVerification().then((results) => {
        const displayedVerificationResults = {
            canVerify: results.canVerify,
            isVerified: results.isIdentical,
            confidence: results.confidence,
            appearsUnderAged: !(results.scannedPerson.age < 18), // do under age check
            furtherChecksRecommended: false, // do further check analysis
            ageVariation: Math.abs(regVoterAge - results.scannedPerson.age),    
            ageVariationAcceptable: Math.abs(regVoterAge - results.scannedPerson.age) < 4, 
            registeredVoter: {
                fullname: regVoterFullname,
                age: regVoterAge,
                gender: regVoterGender,
                vin: regVoterId
            },
            scannedPerson: {
                age: results.scannedPerson.age,
                gender: results.scannedPerson.gender,
                fearFactor: results.scannedPerson.fearFactor,
                hasGlasses: results.scannedPerson.hasGlasses,
                imgBuffer: new Buffer(results.scannedPerson.imgBuffer, 'binary').toString('base64')
            }
        };
        
        res.render('verifyResults', { title: 'Verification Result', results: displayedVerificationResults });
    });

});

module.exports = router;
