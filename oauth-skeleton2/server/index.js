'use strict';

var express = require('express');
const app = require('express')();
var cookieParser = require('cookie-parser');
var cors = require('cors')
const axios = require('axios');
const { AuthorizationCode } = require('simple-oauth2');

const port = 3001;
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


createApplication(({ app, callbackUrl }) => {

  const client = new AuthorizationCode({
    client: {
      id: '66e63d65b6d0e150e6d02776e734188b0767fec5591005332b9e4a920b8371b7',
      secret: '40e116dcf9a8fa0fa9b6719d9d313293939b7515cfab70287819ae3efd9607ec'
    },
    auth: {
      tokenHost: 'https://api.staging.koverse.com',
      tokenPath: '/oauth2/token',
	    authorizeHost: 'https://api.staging.koverse.com',
      authorizePath: '/oauth2/auth',
    }
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

      console.log('The resulting token: ', accessToken);
      console.log('The resulting token.token: ', accessToken.token);
      loggedInState = true;

      // REFACTOR: set access token inside session cookies -> delete after storing jwt
      res.cookie('accessToken', accessToken.token.access_token, { httpOnly: true });

      return res.status(200).json(accessToken).send();
    } catch (error) {
      console.error('Access Token Error or unable to get user credentials', error);
      loggedInState = false;
      return res.status(500).json('Authentication failed');    
    }
  });

  // get credentials
  app.get('/getCredentials', async (req, res, next) => {
    console.log("Reading accessToken cookie in /getCred: " + req.cookies.accessToken)

    // returns user's credentials using accessToken received after KDP4 login
    axios.post('https://api.staging.koverse.com/authentication', 
    {
      "strategy": "jwt",
      "accessToken": req.cookies.accessToken

    })
    .then(response => {
        console.log("Credentials received");
        // add jwt to cookies
        res.cookie('jwt', response.data.accessToken, { httpOnly: true });
        // only send back user data - response.data.user
        res.send(response.data.user)
    })
    .catch(err => {
        console.log("CREDENTIALS NOT RECEIVED")
        console.log(err)
        next(err)
    })

    
  });

  app.get('/logout', async (req, res) => {
    loggedInState = false;
    res.clearCookie('accessToken')
    res.clearCookie('jwt')
    res.end()
  });

  app.get("/loggedIn", (req, res) => {
    console.log(loggedInState)
    res.json(loggedInState)
  })

  app.get("/getData", (req, res) => {

    axios.post('https://api.staging.koverse.com/query', 
        {
                "datasetId": "407246e0-0e97-46d2-8ea1-28d8e96cd520",
                "expression": "SELECT * FROM \"407246e0-0e97-46d2-8ea1-28d8e96cd520\"",
                "limit": 10,
                "offset": 0
        }, 
        {
            headers: {
              "Authorization": "Bearer " + req.cookies.accessToken
            }
        }
        )
        .then(response => {
            console.log(response.data);
            res.send(response.data)
        })
        .catch(err => {
            console.log("DATA NOT RECEIVED")
            res.send(err)
        })

  })

});