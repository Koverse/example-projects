const axios = require('axios');
const { AuthorizationCode } = require('simple-oauth2');

const callbackUrl = 'http://localhost:3000/auth/koverse'
let loggedInState = false;

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

  async function callback(req, res, next) {
    const { code } = req.query;
    const options = {
      code,
	  redirect_uri: callbackUrl,
    };

	console.log('CODE', code)
    try {
      // get accesstoken from authorization code
      const accessToken = await client.getToken(options);

      loggedInState = true;

      res.cookie('accessToken', accessToken.token.access_token, { httpOnly: true });

      return res.status(200).json(accessToken).send();
    } catch (error) {
      console.error('Access Token Error or unable to get user credentials', error);
      loggedInState = false;
      return res.status(500).json('Authentication failed');    
    }
  }

async function logout(req, res, next) {
  loggedInState = false;
  res.clearCookie('accessToken')
  res.clearCookie('jwt')
  res.end()
  }
async function loggedIn(req, res, next) {
    console.log(loggedInState)
    res.json(loggedInState)
  }

async function getCredentials(req, res, next) {
    // returns user's credentials using accessToken received after KDP4 login
    axios.post('https://api.staging.koverse.com/authentication', 
        {
          "strategy": "jwt",
          "accessToken": req.cookies.accessToken

        })
        .then(response => {
            // store response token in local storage
            console.log("Credentials received");

            // add jwt to cookies
            res.cookie('jwt', response.data.accessToken, { httpOnly: true });

            // only send back user data - response.data.user
            res.send(response.data.user)
        })
        .catch(err => {
            console.log("CREDENTIALS NOT RECEIVED")
            next(err)
        })
  }

  module.exports = {
    callback, getCredentials, loggedIn, logout
  };
  