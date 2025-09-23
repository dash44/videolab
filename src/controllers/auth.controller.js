import { USERS, issue } from '../middleware/auth.js';
import { ok, unauthorized } from '../utils/response.js';

export const login = (req, res) => {
    const username = (req.body?.username ?? '').trim();
    const password = (req.body?.password ?? '').trim();

    const u = USERS.find(x=>x.username === username && x.password === password);
    if(!u) return unauthorized(res, 'Invalid credentials');

    return ok(res, { token: issue(u), role: u.role });
}