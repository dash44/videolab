// src/services/signUp.js
import {
  signUp,
  confirmSignUp,
  signIn,
  respondToMfaChallenge,
  associateMfaApp,
  verifyMfaApp,
} from "../aws/cognito.js";

// Sign up user
export const createUser = async (username, email, password) => {
  const res = await signUp(username, password, email);
  return res;
};

// Confirm user
export const confirmUser = async (username, code) => {
  const res = await confirmSignUp(username, code);
  return res;
};

// Authenticate user (initial sign-in)
export const authenticateUser = async (username, password) => {
  const res = await signIn(username, password);
  return res;
};

// Respond to MFA challenge
export const verifyMfa = async (session, code) => {
  const res = await respondToMfaChallenge(session, code);
  return res;
};

// Setup MFA (return secret key for QR code)
export const setupMfa = async (accessToken) => {
  const res = await associateMfaApp(accessToken);
  return res; // Contains SecretCode
};

// Verify MFA during setup
export const confirmMfaSetup = async (accessToken, code) => {
  const res = await verifyMfaApp(accessToken, code);
  return res;
};
