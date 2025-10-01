// src/aws/cognito.js
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  AssociateSoftwareTokenCommand,
  VerifySoftwareTokenCommand,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import {
  CognitoIdentityClient,
  GetIdCommand,
  GetCredentialsForIdentityCommand,
} from "@aws-sdk/client-cognito-identity";

const idpClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const identityClient = new CognitoIdentityClient({
  region: process.env.AWS_REGION,
});

/* ------------------- USER SIGN UP ------------------- */
export const signUp = async (username, password, email) => {
  const cmd = new SignUpCommand({
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: username,
    Password: password,
    UserAttributes: [{ Name: "email", Value: email }],
  });
  return idpClient.send(cmd);
};

/* ------------------- CONFIRM SIGN UP ------------------- */
export const confirmSignUp = async (username, code) => {
  const cmd = new ConfirmSignUpCommand({
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: username,
    ConfirmationCode: code,
  });
  return idpClient.send(cmd);
};

/* ------------------- SIGN IN ------------------- */
export const signIn = async (username, password) => {
  const cmd = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: process.env.COGNITO_CLIENT_ID,
    AuthParameters: { USERNAME: username, PASSWORD: password },
  });
  return idpClient.send(cmd);
};

/* ------------------- MFA FLOW ------------------- */
export const respondToMfaChallenge = async (session, username, code) => {
  const cmd = new RespondToAuthChallengeCommand({
    ClientId: process.env.COGNITO_CLIENT_ID,
    ChallengeName: "SOFTWARE_TOKEN_MFA",
    Session: session,
    ChallengeResponses: {
      USERNAME: username,
      SOFTWARE_TOKEN_MFA_CODE: code,
    },
  });
  return idpClient.send(cmd);
};

export const associateMfaApp = async (accessToken) => {
  const cmd = new AssociateSoftwareTokenCommand({ AccessToken: accessToken });
  return idpClient.send(cmd);
};

export const verifyMfaApp = async (accessToken, code) => {
  const cmd = new VerifySoftwareTokenCommand({
    AccessToken: accessToken,
    UserCode: code,
    FriendlyDeviceName: "AuthenticatorApp",
  });
  return idpClient.send(cmd);
};

/* ------------------- FEDERATED IDENTITIES ------------------- */
// Exchange an IdToken from Google/Facebook/etc. into a Cognito Identity
export const getFederatedIdentity = async (providerName, idToken) => {
  const cmd = new GetIdCommand({
    IdentityPoolId: process.env.COGNITO_IDENTITY_POOL_ID,
    Logins: { [providerName]: idToken },
  });
  return identityClient.send(cmd);
};

export const getFederatedCredentials = async (identityId, providerName, idToken) => {
  const cmd = new GetCredentialsForIdentityCommand({
    IdentityId: identityId,
    Logins: { [providerName]: idToken },
  });
  return identityClient.send(cmd);
};

/* ------------------- USER GROUPS ------------------- */
// Assign a user to a group (requires admin credentials)
export const addUserToGroup = async (username, groupName) => {
  const cmd = new AdminAddUserToGroupCommand({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: username,
    GroupName: groupName,
  });
  return idpClient.send(cmd);
};
