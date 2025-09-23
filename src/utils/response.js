export const ok = (res, data, meta) => res.json({success:true, data, meta});
export const created = (res, data) => res.status(201).json({success:true, data});
export const bad = (res, message, code='bad_request') => res.status(400).json({success:false, error:{code, message}});
export const unauthorized = (res, message='unauthorized') => res.status(401).json({success:false, error:{code:'unauthorized', message}});
export const forbidden = (res, message='forbidden') => res.status(403).json({success:false, error:{code:'forbidden', message}});
export const notfound = (res, message='not_found') => res.status(404).json({success:false, error:{code:'not_found', message}});
export const fail = (res, message='server_error') => res.status(500).json({success:false, error:{code:'server_error', message}});