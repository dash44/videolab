export const ok = (res, data, meta) => res.json({success:true, data, meta});
export const created = (res, data) => res.status(201).json({success:true, data});
export const bad = (res, message, code='bad_request') => res.status(400).json({success:false, error:{code, message}});
export const unauthorized = (res, message='unauthorized') => res.status(401).json({success:false, error:{code:'unauthorized', message}});
export const forbidden = (res, message='forbidden') => res.status(403).json({success:false, error:{code:'forbidden', message}});
export const notfound = (res, message='not_found') => res.status(404).json({success:false, error:{code:'not_found', message}});
export const fail = (res, message='server_error') => res.status(500).json({success:false, error:{code:'server_error', message}});
/* Back-compat helpers so code that imports `success` / `error` still works */
export const success = (res, data, meta) => ok(res, data, meta);
export const error = (res, err, status = 400, code = 'bad_request') =>
  res.status(status).json({
    success: false,
    error: { code, message: (err && err.message) ? err.message : String(err) }
  });

export const badRequest = bad;
export const notFound = notfound;
export const serverError = fail;
