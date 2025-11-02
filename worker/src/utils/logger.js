export const log = (...a) => console.log('[worker]', ...a);
export const err = (...a) => console.error('[worker][error]', ...a);
