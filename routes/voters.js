var express = require('express');
var Datastore = require('@google-cloud/datastore');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    // Your Google Cloud Platform project ID
    var projectId = 'face-accreditation';

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
            voterList.push({ fullname: voter['Full name'], id: voter.VIN });
        });
        res.render('voters', { title: 'Voters List', voters: voterList });
    });
});

module.exports = router;
