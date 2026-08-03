// Enough of node:path for the engine's pure code paths.
//
// The browser build never touches the filesystem, but the engine imports
// these to normalise how evidence files are named in the trace artifact, so
// they have to resolve. POSIX semantics throughout: there is only one
// separator on the web.
export const sep = '/';

export const join = (...parts) => parts.filter(Boolean).join('/').replace(/\/+/g, '/');
export const dirname = (p) => p.split('/').slice(0, -1).join('/') || '.';
export const basename = (p) => p.split('/').pop() ?? '';
export const resolve = (...parts) => join(...parts);
export const isAbsolute = (p) => p.startsWith('/');

/** Path of `to` relative to `from`, POSIX-style. */
export const relative = (from, to) => {
  const a = from.split('/').filter(Boolean);
  const b = to.split('/').filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return [...Array(a.length - i).fill('..'), ...b.slice(i)].join('/');
};

export default { sep, join, dirname, basename, resolve, isAbsolute, relative };
