// server/middleware/auth0.js
const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require("jwks-rsa");

const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE;

if (!domain || !audience) {
  console.warn(
    "Auth0 middleware disabled: AUTH0_DOMAIN or AUTH0_AUDIENCE not set"
  );
  module.exports = null;
} else {
  module.exports = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      jwksUri: `https://${domain}/.well-known/jwks.json`,
    }),
    audience,
    issuer: `https://${domain}/`,
    algorithms: ["RS256"],
  });
}
