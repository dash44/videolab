import { Router } from "express";
import { register, confirm, login } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema, mfaSchema } from "../schemas/auth.schema.js";

const r = Router();

r.post("/register", validate(registerSchema), register);
r.post("/confirm", confirm);
r.post("/login", validate(loginSchema), login);
r.post("/mfa", validate(mfaSchema), login); // reuse login handler for MFA step

export default r;
