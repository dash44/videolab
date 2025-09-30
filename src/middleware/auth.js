import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { unauthorized, forbidden } from '../utils/response.js';

export const issue = (user) =>
  jwt.sign({ sub: user.username, role: user.role }, config.jwtSecret, { expiresIn: '2h' });

export const auth = (roles = []) => (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) return unauthorized(res);

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (roles.length && !roles.includes(payload.role)) {
      return forbidden(res);
    }
    req.user = payload;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return unauthorized(res);
  }
};


export const canSee = (owner, user) =>
  user.role === 'admin' || user.sub === owner;
