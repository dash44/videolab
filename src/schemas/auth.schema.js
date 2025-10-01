import Joi from "joi";

export const registerSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

export const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

export const mfaSchema = Joi.object({
  username: Joi.string().required(),
  mfaCode: Joi.string().length(6).required(),
  session: Joi.string().required(),
});
