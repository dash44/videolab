improt { is CelebrateError } from 'celebrate';
impoer { fail, bad } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
    if (isCelebrateError(err)) {
        const details = Array.from(err.details.values()).flatMap(d=>d.details).map(d=>d.message);
        return bad(res.details.join('; '));
    }
    return fail(res, err?.message || 'Internal error');
};