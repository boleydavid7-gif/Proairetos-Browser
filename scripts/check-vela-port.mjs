#!/usr/bin/env node
/* Static checks for the Vela port of Claude's ProairetOS Browser design.
 * Run: node scripts/check-vela-port.mjs
 * A graphical Zen/Firefox smoke test is still required.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const read = file => readFileSync(resolve(root, file), 'utf8');
const browser = read('scripts/vela-native.js');
const chrome = read('scripts/vela-chrome.css');
const home = read('scripts/lamplight-home.css');
const installer = read('scripts/apply-vela-native.sh');
const preview = read('scripts/preview-lamplight-home.sh');

new Script(browser, { filename: 'scripts/vela-native.js' });
assert.ok(browser.includes('toolbox.append(rail)'), 'tools must stay in the existing Zen sidebar');
assert.ok(!browser.includes('sidebarHost.insertBefore(rail'), 'do not reintroduce the second sidebar');
assert.ok(!browser.includes('strip.append(tabBrowser)'), 'never move Firefox’s native tab container');
assert.ok(browser.includes('const continueTabs'), 'continue area is in privileged chrome');
assert.ok(browser.includes('document.createElementNS("http://www.w3.org/1999/xhtml", "input")'),
  'pin editor must use real HTML inputs inside browser.xhtml');
assert.ok(browser.includes('normalizedSite'), 'pinned website URLs must be validated');
assert.ok(browser.includes('aria-current'), 'navigation selection state must be exposed');

for (const id of ['vela-sidebar-heading', 'vela-add-site-form', 'vela-continue-tabs',
  'vela-tab-favicon', 'vela-top-tabs']) {
  assert.ok(chrome.includes(id), `missing Vela chrome selector: ${id}`);
}
for (const name of ['vela.svg', 'vela-dawn.svg', 'vela-dusk.svg']) {
  assert.ok(existsSync(resolve(root, 'scripts', name)), `missing art: ${name}`);
  if (name !== 'vela.svg') assert.ok(home.includes(name) && preview.includes(name),
    `homepage art not wired into the preview: ${name}`);
}
assert.ok(installer.includes('vela-logo.svg'), 'Vela logo must be packaged into Firefox chrome');
assert.ok(installer.includes('content/browser/'), 'Firefox jar manifest must include Vela assets');
console.log('Vela port static checks passed. Test real tab/sidebar behavior in Zen on Ubuntu.');
