'use strict';

var express = require('express');
const app = require('express')();
var cookieParser = require('cookie-parser');
var cors = require('cors')
const axios = require('axios');
const moment = require("moment");

const { AuthorizationCode } = require('simple-oauth2');

const port = 5000;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

// /public or /build?
app.use(express.static(__dirname + '/client/public'))
app.use(cookieParser());
app.use(cors());

let loggedInState = false;

const createApplication = (cb) => {
  const callbackUrl = 'http://localhost:3000/auth/koverse'

  app.listen(port, (err) => {
    if (err) return console.error(err);

    console.log(`Express server listening at http://localhost:${port}`);

    return cb({
      app,
      callbackUrl,
    });
  });
};


createApplication(({ app, callbackUrl }) => {

  const client = new AuthorizationCode({
    client: {
      // get id and secret from creating a KDP4 Application
      id: '66e63d65b6d0e150e6d02776e734188b0767fec5591005332b9e4a920b8371b7',
      secret: '40e116dcf9a8fa0fa9b6719d9d313293939b7515cfab70287819ae3efd9607ec',
    },
    auth: {
      tokenHost: 'https://api.staging.koverse.com',
      tokenPath: '/oauth2/token',
      authorizeHost: 'https://api.staging.koverse.com',
      authorizePath: '/oauth2/auth',
    }
  });

  // Authorization uri definition
  const authorizationUri = client.authorizeURL({
    redirect_uri: callbackUrl,
    state: '/auth/success'
  });

  // Initial page redirecting
  app.get('/auth', (req, res) => {
    console.log("/auth was called");
    console.log(authorizationUri);
    res.redirect(authorizationUri);
  });

  // Callback service parsing the authorization token and asking for the access token
  app.get('/callback', async (req, res, next) => {
    const { code } = req.query;
    const options = {
      code,
			redirect_uri: callbackUrl,
    };
    try {
      const accessToken = await client.getToken(options);
      loggedInState = true;

      return res.status(200).json(accessToken).send();
    } catch (error) {
      console.error('Access Token Error or unable to get user credentials', error);
      loggedInState = false;
      return res.status(500).json('Authentication failed');    
    }
  });

  // update users loggedIn state across entire app
  app.get('/logout', async (req, res) => {
    loggedInState = false;
    res.send(loggedInState)
  });

  app.get("/loggedIn", (req, res) => {
    console.log(loggedInState)
    res.json(loggedInState)
  })

  // get data from KDP4 dataset
  app.get("/getData3", (req,res) => {
    console.log("entered /getData3")
    const { token } = req.query;
    // gets data from the last 5 minutes every 10 seconds
    let now = moment().subtract("5", "minutes").format("X")
    console.log("current time: " + now)
    axios.post('https://api.staging.koverse.com/query', 
    {
      // below fields can be changed to app's needs
      "datasetId": "9b452877-a363-4303-9fa8-15672a1f62e1",
      //"datasetId": "c83a25f3-26ff-487c-a5cf-b9ba6301d518",
      //"datasetId": "700c4273-8513-4803-9f53-13b350492772",
      "expression": "SELECT * FROM \"9b452877-a363-4303-9fa8-15672a1f62e1\" where \"timestamp\" > " + now,
      //"expression": "SELECT * FROM \"c83a25f3-26ff-487c-a5cf-b9ba6301d518\" where \"flight_aware_ts\" > " + now,
      "limit": 200,
      "offset": 0
    }, 
        {
            headers: {
              "Authorization": "Bearer " + token            
            }
        }
        )
        .then(response => {
            // store response token in local storage
            console.log("data received");
            console.log(response.data)
            res.send(response.data)
        })
        .catch(err => {
          console.log(err)
            console.log("DATA NOT RECEIVED")
            // check if error.message == "jwt expired" so that user can be logged out
        })

  })

  app.get("/getCred", (req,res) => {
    console.log("entered /getCred")
    const { token } = req.query;
    console.log(token)

    // returns user's credentials using accessToken received after KDP4 login
    axios.post('https://api.staging.koverse.com/authentication', 
        {
          "strategy": "jwt",
          "accessToken": token

        })
        .then(response => {
            // store response token in local storage
            console.log("Credentials received");
            res.send(response.data)
        })
        .catch(err => {
            console.log("CREDENTIALS NOT RECEIVED")
            res.send(err)
        })

  })

});