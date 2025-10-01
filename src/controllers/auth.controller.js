import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { success, error } from "../utils/response.js";

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const clientId = process.env.COGNITO_CLIENT_ID;

// Register a new user
export const register = async (req, res) => {
  const { username, password, email } = req.body;
  try {
    await client.send(
      new SignUpCommand({
        ClientId: clientId,
        Username: username,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
        ],
      })
    );
    return success(res, "User registered, please confirm with MFA code sent to email/phone");
  } catch (err) {
    console.error(err);
    return error(res, err.message, 400);
  }
};

// Confirm registration (after receiving MFA/confirmation code)
export const confirm = async (req, res) => {
  const { username, code } = req.body;
  try {
    await client.send(
      new ConfirmSignUpCommand({
        ClientId: clientId,
        Username: username,
        ConfirmationCode: code,
      })
    );
    return success(res, "User confirmed");
  } catch (err) {
    return error(res, err.message, 400);
  }
};

// Login with MFA support
export const login = async (req, res) => {
  const { username, password, mfaCode, session } = req.body;
  try {
    if (session && mfaCode) {
      // Responding to an MFA challenge
      const challengeResp = await client.send(
        new RespondToAuthChallengeCommand({
          ClientId: clientId,
          ChallengeName: "SOFTWARE_TOKEN_MFA", // or "SMS_MFA" depending on Cognito setup
          Session: session,
          ChallengeResponses: {
            USERNAME: username,
            SOFTWARE_TOKEN_MFA_CODE: mfaCode,
          },
        })
      );

      return success(res, "MFA challenge complete", {
        accessToken: challengeResp.AuthenticationResult.AccessToken,
        idToken: challengeResp.AuthenticationResult.IdToken,
        refreshToken: challengeResp.AuthenticationResult.RefreshToken,
      });
    }

    // First login attempt
    const authResp = await client.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      })
    );

    if (authResp.ChallengeName === "SOFTWARE_TOKEN_MFA" || authResp.ChallengeName === "SMS_MFA") {
      return success(res, "MFA required", {
        session: authResp.Session,
        challenge: authResp.ChallengeName,
      });
    }

    return success(res, "Login successful", {
      accessToken: authResp.AuthenticationResult.AccessToken,
      idToken: authResp.AuthenticationResult.IdToken,
      refreshToken: authResp.AuthenticationResult.RefreshToken,
    });
  } catch (err) {
    console.error(err);
    return error(res, err.message, 401);
  }
};
