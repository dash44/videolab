import { Router } from 'express';
import { register, confirm, login } from '../controllers/auth.controller.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { validate } from '../middleware/validate.js';

const r = Router();

r.post('/register', registerSchema, validate, register);
r.get('/confirm/:token', confirm);
r.post('/login', loginSchema, validate, login);

export default r;