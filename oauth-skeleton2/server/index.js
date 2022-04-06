'use strict';

var express = require('express');
const app = require('express')();
var cookieParser = require('cookie-parser');
var cors = require('cors')
const axios = require('axios');
const jwt = require("jsonwebtoken")

const { AuthorizationCode } = require('simple-oauth2');

const port = 5000;
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
      id: '2269be05b435ced00fa363556c6868a77f4c98f9235a811694c670dc92b18f75',
      //id: '444a0f8a0c2dabfdb37c3f54afda14390eb7f1eef09aa78e0fd5f6c7576c324f',
      //secret: '3964abcb8ad7cda385696a7c4bd7edf8a25804bb9d89c54546f051694cb30400',
      secret: 'fb46d9c63951100aaea858e7d2cc4676968714e646266d8adf4d32d0199d3385'
    },
    auth: {
      tokenHost: 'https://api.dev.koverse.com',
      tokenPath: '/oauth2/token',
	    authorizeHost: 'https://api.dev.koverse.com',
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
});