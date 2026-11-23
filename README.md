# Vela — ProairetOS Browser

**Vela** is the web browser developed for **ProairetOS**. Its engine is derived
from [Zen Browser](https://github.com/zen-browser/desktop), built on
[Mozilla Firefox](https://www.mozilla.org/firefox/). The user-facing browser
identity is **Vela**, with ProairetOS Lamplight styling.

## The experience

- A restrained, opaque, Windows 11–inspired interface that tracks the
  currently active ProairetOS Lamplight colors.
- Tabs across the **top**; the right sidebar is for Home, Bookmarks, History,
  Downloads, pinned websites and Continue.
- Branded Vela icon and localized UI naming, with a light/dark homepage.
- Three built-in, CSS-only community-inspired refinements: Find Bar, URL Bar
  and context menus, shipped as part of the browser rather than extensions.
- Real Firefox tabs, session restoration, shortcuts, browsing engine,
  permissions and extensions remain intact.

The interface changes are implemented as a narrowly scoped browser-chrome
integration, not an injection into websites. The Firefox/Zen internals retain
their original identifiers where required for compatibility.

## Build and preview on Ubuntu

This repository expects the Zen/Firefox engine checkout in `engine/` and its
build dependencies installed. On the `proairetos` branch:

```bash
git pull --ff-only origin proairetos
node scripts/check-vela-port.mjs
bash scripts/apply-vela-native.sh
bash scripts/preview-lamplight-home.sh
```

`apply-vela-native.sh` installs the Vela browser-chrome JavaScript,
the logo, and the combined base + curated-mod CSS stylesheet. It applies
branding and invokes `mach build faster -j2` through the branding script.
The preview uses the freshly built local browser executable and a dedicated
Vela test profile.

The preview profile enables custom styling for the home page. Native browser
chrome styling is already bundled into the build and is **not** loaded again
as a profile-level `userChrome.css`.

## Optional mod controls

Open `about:config` to disable the bundled refinements individually:

| Preference | What it controls | Default |
| --- | --- | --- |
| `vela.mods.findbar` | Fluent find-in-page surface | `true` |
| `vela.mods.urlbar` | Rounded Lamplight address bar | `true` |
| `vela.mods.menus` | Native menu styling | `true` |

The mods don't change Vela's top tab bar or right navigation pane.
Source inspiration and MIT attributions: [VELA_MODS_NOTICES.md](scripts/VELA_MODS_NOTICES.md).

## Branding: Vela vs. Zen

The product title, logo and English user-visible strings are branded **Vela**
by `scripts/apply-vela-branding.sh` and `scripts/brand-vela-ui.py`.
This includes Firefox Fluent locale strings and desktop launcher labels
where present in the engine checkout.

Internal engine preferences (such as `zen.tabs.vertical.right-side`),
code identifiers, file paths, the currently named `zen` executable and
upstream links retain their original spelling to avoid breaking browser
behavior. The locale script intentionally doesn't attempt to rewrite source
code or legal text; translations beyond English may retain upstream labels.

## Licenses and upstream attribution

Vela is a fork of **Zen Browser**; Zen Browser is based on **Mozilla Firefox**.
All upstream authors retain credit for their work and applicable license
notices, including the Mozilla Public License 2.0, remain in effect.
Rebranding the browser does not change those licenses or make the engine
original to Vela. See the bundled license files and
[mod notices](scripts/VELA_MODS_NOTICES.md).

Changes are developed on the `proairetos` branch. The upstream names in
this README are attribution, not user-facing product branding.
