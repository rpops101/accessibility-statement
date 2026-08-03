// Enough of node:path for the engine's pure code paths.
export const join = (...parts) => parts.filter(Boolean).join('/').replace(/\/+/g, '/');
export const dirname = (p) => p.split('/').slice(0, -1).join('/') || '.';
export const basename = (p) => p.split('/').pop() ?? '';
export const resolve = (...parts) => join(...parts);
export const isAbsolute = (p) => p.startsWith('/');
export default { join, dirname, basename, resolve, isAbsolute };
