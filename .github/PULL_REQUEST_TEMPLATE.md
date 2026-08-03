<!-- Thank you. A maintainer replies to every first-time contributor within
     24 hours; if it has been longer, ping this thread. -->

## What this changes

<!-- One or two sentences. For a jurisdiction pack: which country, which
     languages, and what quality level you are claiming. -->

## Sources

<!-- Required for packs and legal references. Link the official source for
     the national act and the enforcement body. This is how a reviewer who
     does not read your language verifies the pack. -->

## Checklist

- [ ] `npm test` passes locally
- [ ] For a pack: `npx accessibility-statement validate-pack packages/packs/packs/<code>` is clean
- [ ] For a pack: snapshots committed (`npm run update-snapshots -w @accessibility-statement/packs -- <code>`)
- [ ] For a pack: I added myself to `maintainers` in `pack.yaml` and to `.github/CODEOWNERS`
- [ ] I read the rendered artifact and it reads naturally

## AI assistance

<!-- Required by CONTRIBUTING.md. Using an AI assistant is fine; not saying
     so is not. -->

- [ ] No AI assistance was used
- [ ] AI assistance was used, and I can stand behind the result:
  - How it was used: <!-- e.g. "drafted the translation, which I reviewed as a native speaker" -->
  - [ ] For translations: I speak this language
  - [ ] For legal references: I opened and read each source I cited

---

CI will validate the pack schema and attach the **rendered statement** to
this pull request as an artifact, so you can see your own output before a
human reviews it.
