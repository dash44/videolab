import { validationResult } from "express-validator";
import { createUser, confirmUser, authenticateUser } from "../services/signUp.js";
import { issue } from "../middleware/auth.js";
import { success, error } from "../utils/response.js";


export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, "Validation failed", 400, errors.array());
  }

  const { username, email, password } = req.body;
  try {
    const user = await createUser(username, email, password);


    return success(res, "User registered, check email for confirmation", {
      confirmationToken: user.confirmationToken,
    });
  } catch (err) {
    return error(res, err.message, 400);
  }
};


export const confirm = async (req, res) => {
  const { username, code } = req.body; 
  try {
    await confirmUser(username, code);
    return success(res, "User confirmed");
  } catch (err) {
    return error(res, err.message, 400);
  }
};


export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, "Validation failed", 400, errors.array());
  }

  const { username, password } = req.body;
  try {
    const user = await authenticateUser(username, password);

    const token = issue(user);
    return success(res, "Login successful", { token });
  } catch (err) {
    return error(res, err.message, 401);
  }
};
