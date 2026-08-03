// Enforces NFR-1: no network access at runtime. Ever.
//
// Runs a full render with every outbound network primitive replaced by a
// throwing stub. If any code path tries to open a socket, resolve a host
// or fetch a URL, this fails loudly. Privacy is a differentiator for a
// compliance tool, so it is a test, not a promise.
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const violations = [];

const forbid = (label) => (...args) => {
  violations.push(`${label}(${args.map((a) => JSON.stringify(typeof a === 'function' ? '[fn]' : a)).join(', ').slice(0, 200)})`);
  throw new Error(`NFR-1 violation: ${label} was called`);
};

net.connect = forbid('net.connect');
net.createConnection = forbid('net.createConnection');
tls.connect = forbid('tls.connect');
dns.lookup = forbid('dns.lookup');
dns.resolve = forbid('dns.resolve');
if (dns.promises) {
  dns.promises.lookup = forbid('dns.promises.lookup');
  dns.promises.resolve = forbid('dns.promises.resolve');
}
http.request = forbid('http.request');
http.get = forbid('http.get');
https.request = forbid('https.request');
https.get = forbid('https.get');
globalThis.fetch = forbid('fetch');
globalThis.XMLHttpRequest = function () {
  forbid('XMLHttpRequest')();
};
globalThis.WebSocket = function () {
  forbid('WebSocket')();
};

const core = await import(pathToFileURL(join(root, 'packages/core/dist/esm/index.js')).href);
const { computeConformance, loadEvidence, loadPack, parseConfig, renderArtifact, buildLock, serializeLock } = core;

const PACKS = join(root, 'packages/packs/packs');
const work = mkdtempSync(join(tmpdir(), 'accessibility-statement-nonet-'));

try {
  for (const code of ['eu', 'de', 'fr', 'es', 'it', 'ie']) {
    const packDir = join(PACKS, code);
    const configPath = join(packDir, 'fixture', 'config.yaml');
    const config = parseConfig(readFileSync(configPath, 'utf8'), configPath);
    const pack = loadPack(packDir, { fallbackTemplatesDir: join(PACKS, 'eu') });
    const evidence = loadEvidence(
      config.evidence.paths.map((p) => join(packDir, 'fixture', p))
    );
    const conformance = computeConformance(evidence);
    for (const lang of pack.meta.languages) {
      for (const [kind, format] of [
        ['statement', 'html'],
        ['statement', 'md'],
        ['acr', 'openacr'],
        ['burden', 'html'],
        ['trace', 'json'],
        ['statement', 'docx'],
        ['statement', 'pdf'],
        ['burden', 'docx'],
      ]) {
        renderArtifact(conformance, config, pack, { kind, format, lang });
      }
    }
    serializeLock(buildLock(conformance));
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (violations.length > 0) {
  console.error('::error::NFR-1 violated — the engine attempted network access:');
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('No network access: a full render of every pack opened no sockets, resolved no hosts and issued no requests.');
