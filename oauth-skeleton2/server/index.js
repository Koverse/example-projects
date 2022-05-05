'use strict';

var express = require('express');
const app = require('express')();
var cookieParser = require('cookie-parser');
var cors = require('cors')
const axios = require('axios');
const jwt = require("jsonwebtoken")

const { AuthorizationCode } = require('simple-oauth2');

var AppDAO = require('./daoj.js');

const port = 5000;

console.log(AppDAO);

const DBConn = new AppDAO("../../sqlite-standin/kdp4SolutionsDB");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

// /public or /build?
app.use(express.static(__dirname + '/client/public'))
app.use(cookieParser());
app.use(cors());

let loggedInState = false;

const createApplication = (cb) => {
  //const callbackUrl = 'http://localhost:5000/callback';
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

  //let token = '';

  const client = new AuthorizationCode({
    client: {
      id: '66e63d65b6d0e150e6d02776e734188b0767fec5591005332b9e4a920b8371b7',
      //id: '444a0f8a0c2dabfdb37c3f54afda14390eb7f1eef09aa78e0fd5f6c7576c324f',
      //secret: '3964abcb8ad7cda385696a7c4bd7edf8a25804bb9d89c54546f051694cb30400',
      secret: '40e116dcf9a8fa0fa9b6719d9d313293939b7515cfab70287819ae3efd9607ec'
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
    // scope: 'notifications',
    //state: '3(#0/!~56e' // auth/koverse?
    state: '/auth/success'
  });

  // Initial page redirecting to Github
  app.get('/auth', (req, res) => {
    console.log("/auth was called");
    res.redirect(authorizationUri);
  });

  // Callback service parsing the authorization token and asking for the access token
  app.get('/callback', async (req, res, next) => {
    const { code } = req.query;
    const options = {
      code,
			redirect_uri: callbackUrl,
    };
    console.log(options)

		console.log('CODE', code)
    try {
      const accessToken = await client.getToken(options);
      
      console.log('The resulting token: ', accessToken.token);
      loggedInState = true;

      return res.status(200).json(accessToken).send();
      // return res.redirect('http://localhost:3000/auth/success')
    } catch (error) {
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

  app.get("/getCred", (req,res) => {
    console.log("entered /getCred")
    const { token } = req.query;
    console.log(token)

    axios.post('https://api.staging.koverse.com/authentication', 
        {
          "strategy": "jwt",
          "accessToken": token

        })
        .then(response => {
            // store response token in local storage
            console.log("Credentials received");
            console.log(response);
            res.send(response.data)
        })
        .catch(err => {
            console.log("DATA NOT RECEIVED")
        })
  })

  app.get("/get_all_SQLITE", (req, res) => {
    console.log("entered /get_all_SQLITE")
    console.log("req: ", req.query["query"]);
    const query = req.query["query"];
    DBConn.all(query)
      .then(
        response => {
          console.log(response);
          res.send(response)
        }
      )

  })

});