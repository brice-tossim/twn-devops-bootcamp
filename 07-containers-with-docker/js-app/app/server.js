let express = require('express');
let path = require('path');
let fs = require('fs');
let MongoClient = require('mongodb').MongoClient;
let bodyParser = require('body-parser');
let app = express();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
  });

app.get('/profile-picture', function (req, res) {
  let img = fs.readFileSync(path.join(__dirname, "images/profile-1.jpg"));
  res.writeHead(200, {'Content-Type': 'image/jpg' });
  res.end(img, 'binary');
});

// Set mongo connection URL
const MONGO_DB_NAME = process.env.MONGO_DB_NAME;
const MONGO_DB_USERNAME = process.env.MONGO_DB_USERNAME;
const MONGO_DB_PASSWORD = process.env.MONGO_DB_PASSWORD;
let mongoUrl = `mongodb://${MONGO_DB_USERNAME}:${MONGO_DB_PASSWORD}@mongodb-container:27017/${MONGO_DB_NAME}`;

// pass these options to mongo client connect request to avoid DeprecationWarning for current Server Discovery and Monitoring engine
let mongoClientOptions = { useNewUrlParser: true, useUnifiedTopology: true };

let databaseName = MONGO_DB_NAME;
let collectionName = "users";

app.get('/get-profile', function (req, res) {
  let response = {};
  // Connect to the db using local application or docker compose variable in connection properties
  MongoClient.connect(mongoUrl, mongoClientOptions, function (err, client) {
    if (err) throw err;

    let db = client.db(databaseName);

    let myquery = { userid: 1 };

    db.collection(collectionName).findOne(myquery, function (err, result) {
      if (err) throw err;
      response = result;
      client.close();

      // Send response
      res.send(response ? response : {});
    });
  });
});

app.post('/update-profile', function (req, res) {
  let userObj = req.body;
  // Connect to the db using local application or docker compose variable in connection properties
  MongoClient.connect(mongoUrl, mongoClientOptions, function (err, client) {
    if (err) throw err;

    let db = client.db(databaseName);
    userObj['userid'] = 1;

    let myquery = { userid: 1 };
    let newvalues = { $set: userObj };

    db.collection(collectionName).updateOne(myquery, newvalues, {upsert: true}, function(err, res) {
      if (err) throw err;
      client.close();
    });

  });
  // Send response
  res.send(userObj);
});

app.listen(3000, function () {
  console.log("app listening on port 3000!");
});

