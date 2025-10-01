import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { success, error } from "../utils/response.js";

const REGION = process.env.AWS_REGION || "ap-southeast-2";
const CLIENT_ID = process.env.COGNITO_CLIENT_ID; // must be the NO-SECRET app client id

const client = new CognitoIdentityProviderClient({ region: REGION });

// --- Register ---
export const register = async (req, res) => {
  const { username, password, email } = req.body;
  try {
    await client.send(new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: username,       // You can choose to use email here instead if your pool requires it
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }],
    }));
    return success(res, "User registered, please confirm with the 6-digit code");
  } catch (e) {
    console.error(e);
    return error(res, e.message || "Sign up failed", 400);
  }
};

// --- Confirm code ---
export const confirm = async (req, res) => {
  const { username, code } = req.body;
  try {
    await client.send(new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      Username: username,       // same identifier you used at sign-up
      ConfirmationCode: code,
    }));
    return success(res, "User confirmed");
  } catch (e) {
    console.error(e);
    return error(res, e.message || "Confirmation failed", 400);
  }
};

// --- Login (handles MFA + errors cleanly) ---
export const login = async (req, res) => {
  const { username, password, mfaCode, session } = req.body;

  try {
    // Step 2: respond to MFA challenge (if the UI is sending a code)
    if (session && mfaCode) {
      const challengeResp = await client.send(new RespondToAuthChallengeCommand({
        ClientId: CLIENT_ID,
        ChallengeName: "SOFTWARE_TOKEN_MFA",      // or "SMS_MFA" if that’s what your pool uses
        Session: session,
        ChallengeResponses: {
          USERNAME: username,
          SOFTWARE_TOKEN_MFA_CODE: mfaCode,
        },
      }));

      const ar = challengeResp.AuthenticationResult;
      if (!ar) return error(res, "MFA challenge failed", 401);

      return success(res, "MFA complete", {
        accessToken: ar.AccessToken,
        idToken: ar.IdToken,
        refreshToken: ar.RefreshToken,
        expiresIn: ar.ExpiresIn,
      });
    }

    // Step 1: normal username/email + password login
    const authResp = await client.send(new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: username,      // can be username OR email depending on pool config
        PASSWORD: password,
      },
    }));

    // If Cognito asks for MFA, tell the client to show the MFA UI
    if (authResp.ChallengeName === "SOFTWARE_TOKEN_MFA" || authResp.ChallengeName === "SMS_MFA") {
      return success(res, "MFA required", {
        challenge: authResp.ChallengeName,
        session: authResp.Session,
        username, // echo back so UI doesn’t lose it
      });
    }

    // Successful auth -> return tokens (guard to avoid crashes)
    const ar = authResp.AuthenticationResult;
    if (!ar) return error(res, "Login failed", 401);

    return success(res, "Login successful", {
      accessToken: ar.AccessToken,
      idToken: ar.IdToken,
      refreshToken: ar.RefreshToken,
      expiresIn: ar.ExpiresIn,
    });
  } catch (e) {
    console.error(e);

    // Map common Cognito errors to friendly responses
    const name = e.name || "";
    if (name === "UserNotConfirmedException")
      return error(res, "User not confirmed. Please confirm email.", 401);
    if (name === "NotAuthorizedException")
      return error(res, "Incorrect username/email or password", 401);
    if (name === "UserNotFoundException")
      return error(res, "User not found", 404);
    if (name === "PasswordResetRequiredException")
      return error(res, "Password reset required", 401);
    if (name === "SoftwareTokenMFANotFoundException" || name === "MFAMethodNotFoundException")
      return error(res, "MFA method not found for this user", 401);

    return error(res, e.message || "Login error", 400);
  }
};
