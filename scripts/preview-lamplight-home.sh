#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
root="$PWD"
profile="$root/.lamplight-home-preview"
mkdir -p "$profile/chrome"
install -m644 scripts/lamplight-home.css "$profile/chrome/userContent.css"
cat > "$profile/user.js" <<'EOF'
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref("zen.urlbar.replace-newtab", false);
user_pref("zen.view.use-single-toolbar", false);
user_pref("browser.newtabpage.enabled", true);
user_pref("browser.startup.homepage", "about:home");
user_pref("browser.startup.page", 1);
user_pref("browser.newtabpage.activity-stream.feeds.topsites", true);
user_pref("browser.newtabpage.activity-stream.showSponsoredTopSites", false);
user_pref("browser.newtabpage.activity-stream.showSponsored", false);
user_pref("browser.newtabpage.activity-stream.feeds.section.topstories", false);
user_pref("browser.newtabpage.activity-stream.feeds.system.topstories", false);
EOF
exec "$root/engine/obj-x86_64-pc-linux-gnu/dist/bin/zen" --no-remote --profile "$profile"
