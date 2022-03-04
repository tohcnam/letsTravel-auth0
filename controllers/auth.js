const { auth, requiresAuth } = require('express-openid-connect');
const dotenv = require('dotenv');
dotenv.config();

// auth router attaches /login, /logout, and /callback routes to the baseURL
const config = {
    authRequired: false,
    auth0Logout: true,
    secret: 'a long, randomly-generated string stored in env',
    baseURL: process.env.APPBASEURL,
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    issuerBaseURL: process.env.ISSUER,
    authorizationParams: {
      response_type: 'code',
      scope: process.env.SCOPE,
      audience: process.env.AUDIENCE,
    },
};

const oidc = auth(config)
module.exports = { oidc, requiresAuth };