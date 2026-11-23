#!/usr/bin/env node
/* Static checks for the Vela port of Claude's ProairetOS Browser design.
 * Run: node scripts/check-vela-port.mjs
 * A graphical Zen/Firefox smoke test is still required.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const read = file => readFileSync(resolve(root, file), 'utf8');
const browser = read('scripts/vela-native.js');
const chrome = read('scripts/vela-chrome.css');
const mods = read('scripts/vela-curated-mods.css');
const notices = read('scripts/VELA_MODS_NOTICES.md');
const brand = read('scripts/apply-vela-branding.sh');
const brandLocale = read('scripts/brand-vela-ui.py');
const home = read('scripts/lamplight-home.css');
const installer = read('scripts/apply-vela-native.sh');
const preview = read('scripts/preview-lamplight-home.sh');

new Script(browser, { filename: 'scripts/vela-native.js' });
assert.ok(browser.includes('toolbox.append(rail)'), 'tools must stay in the existing Zen sidebar');
assert.ok(browser.includes('zen.tabs.vertical.right-side'), 'Vela must use Zen native right-hand positioning');
assert.ok(preview.includes('user_pref("zen.tabs.vertical.right-side", true)'),
  'Vela preview profile must position tools on right before startup');
assert.ok(chrome.includes('#zen-browser-tabs-container') &&
  chrome.includes('#tabbrowser-tabs') &&
  chrome.includes('display: none !important'),
  'hide Zen vertical tabs without deleting their actual DOM');
assert.ok(chrome.includes('#navigator-toolbox #vela-native-rail'),
  'Vela tools must remain in right Zen toolbox');
assert.ok(chrome.includes('#vela-top-tabs'), 'horizontal top tabs must remain visible');
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
assert.ok(browser.includes('vela.mods.findbar') &&
  browser.includes('vela.mods.urlbar') && browser.includes('vela.mods.menus'),
  'bundled Zen-inspired mod preferences must exist');
for (const [preference, className] of [
  ['findbar', 'vela-mod-findbar'], ['urlbar', 'vela-mod-urlbar'], ['menus', 'vela-mod-menus']
]) {
  assert.ok(browser.includes('vela.mods.' + preference), 'missing mod preference ' + preference);
  assert.ok(mods.includes('[' + className + '="true"]'), 'missing mod CSS class ' + className);
}
assert.ok(installer.includes('vela-styles.css') &&
  installer.includes('vela-curated-mods.css') &&
  installer.includes('chrome://browser/content/vela-styles.css'),
  'curated mods and base CSS must be embedded as one stylesheet in Firefox chrome');
assert.ok(preview.includes('rm -f "$profile/chrome/userChrome.css"'),
  'preview must not double-load browser chrome styles');
assert.ok(brand.includes('python3 scripts/brand-vela-ui.py') &&
  brandLocale.includes('ZEN_BROWSER') && brandLocale.includes('convert_locale'),
  'brand visible Zen UI strings as Vela without replacing engine identifiers');
assert.ok(brandLocale.includes('restore_damaged_locale') &&
  brandLocale.includes('result.count("\\n")') &&
  brandLocale.includes('MERGED_FTL_KEYS'),
  'branding must preserve translation newlines and recover old corrupt settings');
execFileSync('python3', ['scripts/test-brand-vela-ui.py'], {
  cwd: root, stdio: 'inherit',
});
assert.ok(notices.includes('RobotoSkunk') && notices.includes('matteo-tafuro') &&
  notices.includes('KiKaraage') && notices.includes('MIT License'),
  'upstream community mod attributions and permission notices must be preserved');
for (const [name, cssText] of [['browser', chrome], ['mods', mods]]) {
  const braces = [...cssText.matchAll(/[{}]/g)].reduce(
    (n, match) => n + (match[0] === '{' ? 1 : -1), 0);
  assert.equal(braces, 0, name + ' CSS brace balance');
}
assert.ok(installer.includes('vela-logo.svg'), 'Vela logo must be packaged into Firefox chrome');
assert.ok(installer.includes('content/browser/'), 'Firefox jar manifest must include Vela assets');
console.log('Vela port static checks passed. Test real tab/sidebar behavior in Zen on Ubuntu.');
