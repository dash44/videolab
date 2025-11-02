export const success = (res, data, status = 200) => res.status(status).json(data);
export const fail = (res, message, code = 500) => res.status(code).json({ error: message });
