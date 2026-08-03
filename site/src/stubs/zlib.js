// DOCX is a ZIP, and a ZIP needs a deflate implementation. Rather than ship
// one to every visitor for a format most will not use, the browser build
// omits it and the UI points at the CLI for Word output.
export const deflateRawSync = () => {
  throw new Error(
    'Word (.docx) output is not available in the browser. Install the CLI: npx accessibility-statement'
  );
};
export default { deflateRawSync };
