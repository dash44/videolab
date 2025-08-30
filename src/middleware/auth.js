import jwt from 'jsonwebtoken';
import {config} from '../utils/config.js';
import {unauthorized, forbidden} from '../utils/response.js'
export const USERS = [
    { username:'admin', password:'admin123', role:'admin' },
    { username:'alice', password:'alice123', role:'user' }
    ];
export const issue = (u)=> jwt.sign({ sub:u.username, role:u.role }, config.jwtSecret, { expiresIn: '2h' });
export const auth = (roles=[]) => (req, res, next) => {
    const h = req.headers.authorization || '';
    const t=h.startsWith('Bearer ')?h.slice(7) : '';
    try{
        const p = jwt.verify(t, config.jwtSecret);
        if (roles.length && !roles.includes(p.role)) return forbidden(res);
        req.user = p;
        next();
    }catch{
        return unauthorized(res);
    };
};
export const canSee = (owner, u) => u.role === 'admin' || u.sub === owner;
