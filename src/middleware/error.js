import celebratePkg from 'celebrate';
const { isCelebrateError } = celebratePkg;
import { fail, bad } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
    if (isCelebrateError && isCelebrateError(err)) {
        const details = Array.from(err.details.values())
            .flatMap(d => d.details)
            .map(d => d.message);
        return bad(res, details.join('; '));
    }

    return fail(res, err?.message || 'Internal error');
};
