import { Router } from 'express';
import { body } from 'celebrate';
import { login } from '../controllers/auth.controller.js';
import { loginSchema } from '../schemas/auth.schema.js';

const r = Router();

r.post('/login', body(loginSchema), login);

export default r;