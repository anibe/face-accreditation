const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({dest:'./public/uploads/', storage: storage });
const fs = require('fs');
const request = require('request');
const Datastore = require('@google-cloud/datastore');
const moment = require('moment');
const subscriptionKey = '<sub key>';
const projectId = 'face-validate'; // Your Google Cloud Platform project ID

router.get('/', function (req, res, next) {   
    res.render('scanVoter', { title: 'Verify Voter' });
});

function detectFace(uploadedFileBinary) {
    const uriBase = 'https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect';
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

function compareFaces(regVoterFaceIdObj, scannedVoterFaceIdObj) {
    const uriBase = 'https://westcentralus.api.cognitive.microsoft.com/face/v1.0/verify';

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

    const scannedFileBuffer = req.file.buffer;

    var datastore = new Datastore({
        projectId: projectId
    });

    var votersQuery = datastore
        .createQuery('Register')
        .order('VIN', {
            descending: false,
        });

    function calcAge(DOB) {
        return moment().diff(DOB, 'years');
    }

    datastore.runQuery(votersQuery).then(dbResults => {
        var voters = dbResults[0];
        let displayedVerificationResults;

        const readFile = (path, opts = {}) =>
        new Promise((resolve, reject) => {
            fs.readFile(path, opts, (err, data) => {
                if (err) reject(err)
                else resolve(data)
            })
        });

        voters.every(voter => {
        
            async function doVerification() {
                const regVoterImageBuffer = await readFile('./public/images/registered-voters/'+ voter.VIN +'.jpeg');
                const regVoterFaceIdObj = await detectFace(regVoterImageBuffer);
                const scannedVoterFaceIdObj = await detectFace(scannedFileBuffer);
        
                return await compareFaces(regVoterFaceIdObj, scannedVoterFaceIdObj);
            }
            
            doVerification().then((results) => {
                console.log(results);
                displayedVerificationResults = {
                    canVerify: results.canVerify,
                    isVerified: results.isIdentical,
                    confidence: results.confidence,
                    appearsUnderAged: false, // do under age check
                    furtherChecksRecommended: false, // do further check analysis,
                    ageVariation: calcAge(voter.DOB) - results.scannedPerson.age,
                    registeredVoter: {
                        fullname: voter['Full name'],
                        age: calcAge(voter.DOB),
                        vin: voter.VIN
                    },
                    scannedPerson: {
                        age: results.scannedPerson.age,
                        fearFactor: results.scannedPerson.fearFactor,
                        hasGlasses: results.scannedPerson.hasGlasses,
                        imgBuffer: new Buffer(results.scannedPerson.imgBuffer, 'binary').toString('base64')
                    }
                };
                
                return results.isIdentical;
            });            
        });
        res.render('verifyResults', { title: 'Verification Result', results: displayedVerificationResults });
        
    });

});

module.exports = router;
