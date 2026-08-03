/**
 * Generator page behaviour.
 *
 * No framework, no dependencies. Progressive enhancement: the form is real
 * HTML and the page explains the CLI path if scripting is unavailable.
 *
 * Accessibility is not optional here — a tool whose subject matter is
 * accessibility cannot ship an inaccessible interface. So: real labels,
 * a live region for results, focus moved to the output, errors associated
 * with their field, and no keyboard trap anywhere.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const form = $('gen-form');
  if (!form) return;

  const api = globalThis.AccessibilityStatement;
  const status = $('gen-status');
  const output = $('gen-output');
  const outputWrap = $('gen-output-wrap');
  const errorBox = $('gen-error');
  const evidenceField = $('evidence');
  const fileInput = $('evidence-file');
  const downloadLink = $('gen-download');
  const previewFrame = $('gen-preview');
  const summary = $('gen-summary');

  // The engine failed to load (blocked script, old browser). Say so plainly
  // rather than leaving a dead button.
  if (!api) {
    form.hidden = true;
    const fallback = $('gen-nojs');
    if (fallback) fallback.hidden = false;
    return;
  }

  function announce(message) {
    status.textContent = message;
  }

  function showError(message, detail) {
    errorBox.hidden = false;
    errorBox.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = message;
    errorBox.appendChild(strong);
    if (detail) {
      const p = document.createElement('p');
      p.textContent = detail;
      errorBox.appendChild(p);
    }
    outputWrap.hidden = true;
    announce('Could not generate the document. ' + message);
    errorBox.focus();
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  // Reading a local file never uploads it; FileReader is entirely local.
  if (fileInput) {
    fileInput.addEventListener('change', function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        evidenceField.value = String(reader.result || '');
        announce('Loaded ' + file.name + '. Nothing was uploaded.');
      };
      reader.onerror = function () {
        showError('Could not read that file.', 'Try pasting its contents into the box instead.');
      };
      reader.readAsText(file);
    });
  }

  function languagesFor(country) {
    const pack = api.packs[country];
    return pack ? pack.meta.languages : ['en'];
  }

  const countrySelect = $('country');
  const langSelect = $('lang');

  function syncLanguages() {
    const langs = languagesFor(countrySelect.value);
    const previous = langSelect.value;
    langSelect.innerHTML = '';
    langs.forEach(function (code) {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = code;
      langSelect.appendChild(option);
    });
    if (langs.indexOf(previous) !== -1) langSelect.value = previous;
  }

  countrySelect.addEventListener('change', syncLanguages);
  syncLanguages();

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearError();

    const evidenceText = evidenceField.value.trim();
    if (!evidenceText) {
      showError(
        'Paste your accessibility test results first.',
        'An axe-core, pa11y or Lighthouse JSON report. Nothing is sent anywhere — the generator runs in this tab.'
      );
      evidenceField.focus();
      return;
    }

    const data = new FormData(form);
    const config = {
      organisation: {
        name: String(data.get('org') || 'Your organisation'),
        email: String(data.get('email') || ''),
      },
      product: {
        name: String(data.get('product') || 'Your website'),
        scope: String(data.get('scope') || ''),
      },
      jurisdiction: String(data.get('country')),
      languages: [String(data.get('lang'))],
      evidence: { paths: [] },
      dates: { preparation: String(data.get('date') || '') },
      evaluationMethod: 'Self-assessment with automated testing.',
      feedback: { email: String(data.get('email') || '') },
    };

    if (!/^\d{4}-\d{2}-\d{2}$/.test(config.dates.preparation)) {
      showError('The preparation date must look like 2026-08-03.',
        'Dates are explicit so the same inputs always produce the same document.');
      $('date').focus();
      return;
    }

    announce('Generating…');

    let result;
    try {
      result = api.generate({
        evidenceText: evidenceText,
        evidenceName: 'pasted-evidence.json',
        config: config,
        country: String(data.get('country')),
        lang: String(data.get('lang')),
        kind: String(data.get('kind')),
        format: String(data.get('format')),
      });
    } catch (error) {
      // The engine's errors are already written to be actionable.
      const message = (error && error.what) || (error && error.message) || String(error);
      const detail = (error && error.fix) || '';
      showError(message, detail);
      return;
    }

    const artifact = result.artifact;
    const totals = result.conformance.summary.totals;

    summary.textContent =
      'Compliance: ' + result.conformance.summary.compliance +
      ' · pass ' + totals.pass +
      ' · fail ' + totals.fail +
      ' · not evaluated ' + totals['not-evaluated'];

    // Show the document. srcdoc keeps it sandboxed and same-page.
    if (artifact.format === 'html') {
      previewFrame.hidden = false;
      previewFrame.setAttribute('srcdoc', artifact.content);
      output.hidden = true;
    } else {
      previewFrame.hidden = true;
      previewFrame.removeAttribute('srcdoc');
      output.hidden = false;
      output.textContent = artifact.isBinary
        ? '(binary document — use the download button)'
        : artifact.content;
    }

    const mime =
      artifact.format === 'html' ? 'text/html'
      : artifact.format === 'pdf' ? 'application/pdf'
      : artifact.format === 'openacr' ? 'text/yaml'
      : artifact.format === 'json' ? 'application/json'
      : 'text/markdown';

    const blob = artifact.bytes
      ? new Blob([artifact.bytes], { type: mime })
      : new Blob([artifact.content], { type: mime + ';charset=utf-8' });

    if (downloadLink.dataset.url) URL.revokeObjectURL(downloadLink.dataset.url);
    const url = URL.createObjectURL(blob);
    downloadLink.dataset.url = url;
    downloadLink.href = url;
    downloadLink.download = artifact.filenameHint;
    downloadLink.textContent = 'Download ' + artifact.filenameHint;

    outputWrap.hidden = false;
    announce('Document ready. ' + summary.textContent);
    // Move focus to the result so keyboard and screen-reader users land on it.
    outputWrap.focus();
  });
})();
