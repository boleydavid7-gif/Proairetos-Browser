# Vela curated appearance: upstream acknowledgments and licenses

Vela uses **original Lamplight CSS adaptations** of UI concepts from the following
Firefox/Zen customization projects. The bundled CSS is in
`scripts/vela-curated-mods.css`; it is deliberately not a verbatim copy of
the upstream mod bundles. It does not install Sine, modify webpages, change
Firefox's real tab DOM, or request browser-extension privileges.

| Vela feature | Inspiration | Upstream project | License |
| --- | --- | --- | --- |
| Find-in-page flyout | Better Find Bar | https://github.com/RobotoSkunk/ff-better-findbar | MIT |
| Address/results styling | Better Cleaned URL Bar | https://github.com/matteo-tafuro/zen-better-cleaned-url-bar | MIT |
| Native context-menu spacing | Zen Context Menu | https://github.com/KiKaraage/ZenMods | MIT |

The third-party projects and their logos remain their respective creators'
work; Vela does not claim these projects as its own. Upstream source is useful
for further ideas, but its CSS should **not** be pasted over Vela's tab strip,
right navigation pane or dynamically derived Lamplight palette.

## MIT acknowledgments

**Better Find Bar:** Copyright (c) 2024 Edgar Lima (RobotoSkunk).

**Better Cleaned URL Bar:** Copyright (c) 2026 matteo-tafuro.

**Zen Context Menu:** Copyright (c) 2025 KiKaraage.

The following license text is retained for each of these three upstream
MIT-licensed projects:

> MIT License
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
> FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
> IN THE SOFTWARE.

## Original browser engine

Vela derives from **Zen Browser** (https://github.com/zen-browser/desktop),
which is built on Mozilla Firefox. Retain the upstream credits, copyright
notices and applicable Mozilla Public License 2.0 notices when distributing the
fork. Vela's user-visible rebranding does not remove those obligations.

## Customization

The bundled modifications are enabled by default. To disable a specific
feature in Vela's `about:config`, set it to `false`:

- `vela.mods.findbar`: floating, opaque find-in-page surface.
- `vela.mods.urlbar`: clean, rounded, Lamplight address bar.
- `vela.mods.menus`: Fluent-inspired native context-menu spacing.

The changes follow Vela's current `--lamplight-*` variables; they do not
force another theme or require a separate mod manager.

The external mod names and upstream repositories remain "Zen" where appropriate
in legal notices. The binary is still named `zen` internally to preserve engine
startup and update compatibility, but the product and localized UI display Vela.
