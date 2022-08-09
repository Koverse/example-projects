'use strict';

var express = require('express');
const app = require('express')();
var cookieParser = require('cookie-parser');
var cors = require('cors')
const axios = require('axios');

const { AuthorizationCode } = require('simple-oauth2');

const port = 5000;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

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

// TRAINING: Sets up Oauth2 Authentication Settings for authentication through KDP4 to work
createApplication(({ app, callbackUrl }) => {

  const client = new AuthorizationCode({
    client: {
      // TRAINING TODO: Replace id and secret with values received after creating KDP4 application
      id: '66e63d65b6d0e150e6d02776e734188b0767fec5591005332b9e4a920b8371b7',
      secret: '40e116dcf9a8fa0fa9b6719d9d313293939b7515cfab70287819ae3efd9607ec'
    },
    auth: {
      // TRAINING TODO: Replace token host and authorize host with the base url of the workspace you are using
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

  // Initial page redirecting to Homepage after successfully login in
  app.get('/auth', (req, res) => {
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
      console.log('The resulting token: ', accessToken.token);
      loggedInState = true;

      return res.status(200).json(accessToken).send();
    } 
    catch (error) {
      console.error('Access Token Error or unable to get user credentials', error);
      loggedInState = false;
      return res.status(500).json('Authentication failed');    
    }
  });

  app.get('/logout', async (req, res) => {
    loggedInState = false;
    res.send(loggedInState)
  });

  app.get("/loggedIn", (req, res) => {
    console.log(loggedInState)
    res.json(loggedInState)
  })

  app.get("/getCredentials", (req, res) => {
    const { token } = req.query;

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

  app.get("/writeData", (req, res) => {

    // saves access token parameter  as 'token' so users specific JWT token can be used to make the Authorizes '/write' call
    const { token } = req.query;

    // TRAINING TODO: Replace with corresponding values
    // https://${BASE_API_URL}/write/${DATASET_ID_WRITE_TO}
    axios.post("https://api.staging.koverse.com/write/d5c118f9-9cf6-42b1-98e4-1ed64d34c5ec", 
    [
      // TRAINING TODO: Modify the below JSON object you will be writing to as a SINGLE record to a KDP4 dataset. 
      // The key-value pairs are considered column-rowValue pairs in KDP4 dataset. 
      {
        "column1": "value1",
        "column2": "value2",
        "column3": "value3",
      }
    ],
    {
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      }  
    }).then((response) => {
      console.log(response)
      //Successfully wrote text to kdp4
    })
    .catch((error) => {
      console.log(error)
    });
    
  })

});