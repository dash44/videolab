import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { unauthorized, forbidden } from "../utils/response.js";

const region = process.env.AWS_REGION;
const userPoolId = process.env.COGNITO_USER_POOL_ID;

const client = jwksClient({
  jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export const auth = (roles = []) => (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return unauthorized(res);

  jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
    if (err) return unauthorized(res);

    const groups = decoded["cognito:groups"] || [];
    if (roles.length && !roles.some((r) => groups.includes(r))) {
      return forbidden(res);
    }

    req.user = decoded;
    next();
  });
};
