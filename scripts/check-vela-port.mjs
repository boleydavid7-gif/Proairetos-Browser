#!/usr/bin/env node
/* Static checks for Vela's browser window, new tab page, branding and settings.
 * Run: node scripts/check-vela-port.mjs
 * To see the result, run scripts/vela-preview.sh (a real Zen release with Vela put in, as the build does).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const read = file => readFileSync(resolve(root, file), 'utf8');
const browser = read('scripts/vela-native.js');
const chrome = read('scripts/vela-chrome.css');
const mods = read('scripts/vela-curated-mods.css');
const home = read('scripts/vela-home.css');
const notices = read('scripts/VELA_MODS_NOTICES.md');
const brand = read('scripts/apply-vela-branding.sh');
const brandLocale = read('scripts/brand-vela-ui.py');
const installer = read('scripts/apply-vela-native.sh');
const preview = read('scripts/vela-preview.sh');
const velaPrefs = read('prefs/zen/vela.yaml');

// The window script parses, and keeps Firefox's tabs where Zen keeps them.
new Script(browser, { filename: 'scripts/vela-native.js' });
assert.ok(!/tabbrowser-tabs[^\n]*\.(append|prepend|before|after|moveBefore)\(/.test(browser),
  'never move Firefox\'s tab container; the tab row shows gBrowser\'s tabs');
assert.ok(browser.includes('gBrowser.selectedTab = tab') && browser.includes('removeTab(tab'),
  'the tab row selects and closes real tabs');
assert.ok(browser.includes('moveTabTo'), 'dragging moves real tabs');
assert.ok(browser.includes('tabContextMenu'), 'right-click opens Firefox\'s own tab menu');
assert.ok(!browser.includes('zen.tabs.vertical.right-side'), 'Vela does not force Zen\'s sidebar to the right');
assert.ok(!browser.includes('PathUtils.homeDir'), 'PathUtils.homeDir does not exist in this Firefox');
assert.ok(browser.includes('Services.dirsvc.get("Home"'), 'the ProairetOS palette is found through the home folder');
assert.ok(browser.includes('vela.theme.colors') && chrome.includes('[vela-colors="system"]'),
  'Vela colors and system colors');
assert.ok(chrome.includes('AccentColor') && chrome.includes('Canvas'), 'system colors use the system\'s own colors');
assert.ok(home.includes('-moz-pref("vela.theme.colors", "system")'), 'the new tab page follows the color choice');
assert.ok(chrome.includes('prefers-reduced-motion'), 'motion respects reduced motion');
assert.ok(browser.includes('TRUSTED_ICON'), 'only favicons Firefox resolved are shown in the window');

// Every icon the styles or the script name is packaged.
const icons = new Set(readdirSync(resolve(root, 'scripts/vela-icons')));
const named = new Set([
  ...[...chrome.matchAll(/url\("vela-icons\/([^"]+)"\)/g)].map(m => m[1]),
  ...[...browser.matchAll(/chrome:\/\/browser\/content\/vela-icons\/([^"]+)"/g)].map(m => m[1]),
]);
for (const icon of named) assert.ok(icons.has(icon), `missing icon: scripts/vela-icons/${icon}`);
assert.ok(chrome.includes('url("vela-logo.svg")') && existsSync(resolve(root, 'scripts/vela.svg')), 'logo');
assert.ok(chrome.includes('url("fonts/eb-garamond-500.woff2")') && existsSync(resolve(root, 'scripts/fonts/eb-garamond-500.woff2')),
  'the wordmark\'s serif');
assert.ok(existsSync(resolve(root, 'scripts/fonts/OFL-EB-Garamond.txt')), 'the font\'s license travels with it');

// The new tab page: its content rules allow images but no web fonts, so the serif is a drawing.
assert.ok(!/@font-face/.test(home), 'the new tab page cannot load web fonts');
const built = resolve(tmpdir(), 'vela-home-check.css');
execFileSync('python3', [resolve(root, 'scripts/build-vela-home.py'), built], { stdio: 'inherit' });
assert.ok(!readFileSync(built, 'utf8').includes('@VELA_'), 'every placeholder in vela-home.css is filled');

// Packaging into the build, and the preview doing the same.
for (const text of [installer, preview]) {
  assert.ok(text.includes('vela-styles.css') && text.includes('vela-native.js') && text.includes('vela-icons'),
    'stylesheet, script and icons are packaged under chrome://browser/content/');
  assert.ok(text.includes('browser-main') && text.includes('activity-stream.css'), 'browser.xhtml and the new tab sheet');
}
assert.ok(installer.includes('vela-home begin'), 'the new tab sheet is replaced, not added again, on a second run');
assert.ok(installer.includes('vela-curated-mods.css'), 'curated mods are embedded with the base stylesheet');

// Settings the layout depends on.
const pref = (file, name) => read(file).match(new RegExp(`- name: ${name.replaceAll('.', '\\.')}\\n(?:  \\w+: .*\\n)*?  value: (.*)`))?.[1];
assert.equal(pref('prefs/zen/view.yaml', 'zen.view.use-single-toolbar'), 'false', 'two-row window');
assert.equal(pref('prefs/zen/view.yaml', 'zen.view.sidebar-expanded'), 'false', 'narrow sidebar for the rail');
assert.equal(pref('prefs/zen/view.yaml', 'zen.view.show-newtab-button-top'), 'false', 'new tabs at the end of the row');
assert.equal(pref('prefs/zen/zen-urlbar.yaml', 'zen.urlbar.replace-newtab'), 'false', 'the new tab page, not a floating bar');
assert.equal(pref('prefs/zen/zen-urlbar.yaml', 'zen.urlbar.behavior'), 'normal', 'the address field stays in the toolbar');
assert.equal(pref('prefs/zen/welcome.yaml', 'zen.welcome-screen.seen'), 'true', 'Zen\'s welcome is skipped');
assert.equal(pref('prefs/firefox/newtab.yaml', 'browser.newtabpage.activity-stream.feeds.topsites'), 'true', 'shortcut tiles');
for (const name of ['vela.theme.colors', 'vela.rail.hidden', 'vela.mods.findbar', 'vela.mods.urlbar', 'vela.mods.menus',
  'browser.newtabpage.pinned', 'browser.topsites.useRemoteSetting']) {
  assert.ok(velaPrefs.includes(`- name: ${name}\n`), `missing setting ${name}`);
}
JSON.parse(velaPrefs.match(/- name: browser\.newtabpage\.pinned\n  value: '(.*)'/)[1]);

// Built-in mods and their notices.
for (const [preference, attribute] of [['findbar', 'vela-mod-findbar'], ['urlbar', 'vela-mod-urlbar'], ['menus', 'vela-mod-menus']]) {
  assert.ok(browser.includes('vela.mods.' + preference), 'missing mod preference ' + preference);
  assert.ok(mods.includes('[' + attribute + '="true"]'), 'missing mod CSS ' + attribute);
}
assert.ok(notices.includes('RobotoSkunk') && notices.includes('matteo-tafuro') &&
  notices.includes('KiKaraage') && notices.includes('MIT License'),
  'upstream community mod attributions and permission notices must be preserved');

// Branding.
const surfer = JSON.parse(read('surfer.json'));
for (const [kind, brandInfo] of Object.entries(surfer.brands)) {
  for (const key of ['brandShorterName', 'brandShortName', 'brandFullName']) {
    assert.ok(!/\bZen\b/.test(brandInfo[key]), `${kind} ${key} still says Zen`);
  }
}
// Updates never reach Zen's server; on Linux the package updates Vela.
assert.ok(!JSON.stringify(surfer).includes('zen-browser.app'), 'no Vela build may ask Zen for updates');
assert.ok(surfer.updateHostname.endsWith('.invalid'), 'the update address never resolves');
assert.ok(read('configs/linux/mozconfig').includes('--disable-updater'), 'Linux builds have no updater of their own');
assert.ok(!read('configs/common/mozconfig').includes('zen-browser/desktop'), 'the build names Vela\'s source repository');
// Sharing and the mods store do not reach Zen's servers.
for (const file of ['prefs/zen/share.yaml', 'prefs/zen/mods.yaml', 'src/build/moz-build.patch',
  'src/browser/components/preferences/zenMarketplace.inc.xhtml']) {
  assert.ok(!/^[^#\n]*zen-browser\.app/m.test(read(file).split('\n').filter(l => !l.startsWith('-')).join('\n')),
    `${file} still points at a Zen server`);
}
assert.equal(pref('prefs/zen/share.yaml', 'zen.share.enabled'), 'false', 'sharing is off');
assert.ok(read('src/zen/share/ZenShareManager.mjs').includes('"zen.share.enabled"'), 'sharing checks its switch');
assert.ok(read('src/zen/boosts/ZenBoostsEditor.mjs').includes('"zen.share.enabled"'), 'boost sharing checks its switch');
assert.ok(brand.includes('python3 scripts/brand-vela-ui.py') &&
  brandLocale.includes('ZEN_BROWSER') && brandLocale.includes('convert_locale'),
  'brand visible Zen UI strings as Vela without replacing engine identifiers');
assert.ok(brandLocale.includes('restore_damaged_locale') &&
  brandLocale.includes('result.count("\\n")') && brandLocale.includes('MERGED_FTL_KEYS'),
  'branding must preserve translation newlines and recover old corrupt settings');
execFileSync('python3', ['scripts/test-brand-vela-ui.py'], { cwd: root, stdio: 'inherit' });

for (const [name, cssText] of [['browser', chrome], ['mods', mods], ['home', home]]) {
  const braces = [...cssText.matchAll(/[{}]/g)].reduce((n, match) => n + (match[0] === '{' ? 1 : -1), 0);
  assert.equal(braces, 0, name + ' CSS brace balance');
}
console.log('Vela checks passed. scripts/vela-preview.sh shows the result in a real Zen release.');
