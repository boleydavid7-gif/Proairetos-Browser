#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
root="$PWD"
profile="$root/.lamplight-home-preview"
mkdir -p "$profile/chrome"
install -m644 scripts/lamplight-home.css "$profile/chrome/userContent.css"
install -m644 scripts/vela.svg "$profile/chrome/vela.svg"
install -m644 scripts/vela-landscape.svg "$profile/chrome/vela-landscape.svg"
install -m644 scripts/vela-dusk.svg "$profile/chrome/vela-dusk.svg"
install -m644 scripts/vela-dawn.svg "$profile/chrome/vela-dawn.svg"
# Browser chrome styles and curated mods are now embedded in the Vela build
# through browser.xhtml. Avoid loading them twice via userChrome.css.
rm -f "$profile/chrome/userChrome.css"
cat > "$profile/user.js" <<'EOF'
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref("zen.urlbar.replace-newtab", false);
user_pref("zen.view.use-single-toolbar", false);
user_pref("zen.tabs.vertical.right-side", true);
user_pref("browser.newtabpage.enabled", true);
user_pref("browser.startup.homepage", "about:home");
user_pref("browser.startup.page", 1);
user_pref("browser.newtabpage.activity-stream.feeds.topsites", true);
user_pref("browser.newtabpage.activity-stream.showSponsoredTopSites", false);
user_pref("browser.newtabpage.activity-stream.showSponsored", false);
user_pref("browser.newtabpage.activity-stream.feeds.section.topstories", false);
user_pref("browser.newtabpage.activity-stream.feeds.system.topstories", false);
EOF
exec "$root/engine/obj-x86_64-pc-linux-gnu/dist/bin/zen" --profile "$profile" "$@"
