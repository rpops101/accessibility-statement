// Browser stubs for the Node built-ins the engine imports.
//
// The engine is bundled for the browser to power the in-page generator. The
// code paths the page uses — parsing evidence, computing conformance,
// rendering — never touch the filesystem; only the CLI's loaders do. These
// stubs let the bundler resolve those imports and fail loudly if anything
// ever does reach for them.
const unavailable = (name) => () => {
  throw new Error(`${name} is not available in the browser build; use the CLI for that.`);
};
export const readFileSync = unavailable('readFileSync');
export const writeFileSync = unavailable('writeFileSync');
export const readdirSync = () => [];
export const existsSync = () => false;
export const mkdirSync = unavailable('mkdirSync');
export const realpathSync = unavailable('realpathSync');
export default { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, realpathSync };
