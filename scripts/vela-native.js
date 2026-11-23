/* Loaded only in the privileged browser window, never in web content. */
(() => {
  "use strict";
  function initialize() {
    const root = document.documentElement;
    if (root.getAttribute("windowtype") !== "navigator:browser" ||
        window.arguments?.[0] === "about:privatebrowsing" ||
        root.hasAttribute("privatebrowsingmode")) return;
    const toolbox = document.getElementById("navigator-toolbox");
    if (!toolbox) return;
    if (document.getElementById("vela-native-rail")) return;
    const Services = globalThis.Services || ChromeUtils.importESModule("resource://gre/modules/Services.sys.mjs").Services;
    const rail = document.createXULElement("vbox");
    rail.id = "vela-native-rail";
    rail.setAttribute("aria-label", "Vela browser tools");
    const heading = document.createXULElement("hbox");
    heading.id = "vela-sidebar-heading";
    const title = document.createXULElement("label");
    title.setAttribute("value", "ProairetOS Browser");
    title.className = "vela-rail-heading";
    const brandMark = document.createXULElement("image");
    brandMark.id = "vela-sidebar-brandmark";
    brandMark.setAttribute("src", "chrome://browser/content/vela-logo.svg");
    const brandWords = document.createXULElement("vbox");
    brandWords.id = "vela-sidebar-brandwords";
    const subTitle = document.createXULElement("label");
    subTitle.className = "vela-rail-subtitle";
    subTitle.setAttribute("value", "Vela");
    brandWords.append(title, subTitle);
    heading.append(brandMark, brandWords);
    rail.append(heading);
    const actions = document.createXULElement("vbox");
    actions.id = "vela-sidebar-actions";
    rail.append(actions);
    function action(label, command, tooltip) {
      const button = document.createXULElement("toolbarbutton");
      button.setAttribute("label", label);
      button.setAttribute("tooltiptext", tooltip || label);
      button.classList.add("vela-sidebar-action");
      button.addEventListener("command", () => {
        const target = document.getElementById(command);
        if (label === "Home") window.openTrustedLinkIn("about:home", "current");
        else if (target && !target.disabled) target.doCommand?.();
        else if (label === "Bookmarks") window.PlacesCommandHook?.showPlacesOrganizer?.("AllBookmarks");
        else if (label === "History") window.PlacesCommandHook?.showPlacesOrganizer?.("History");
        else if (label === "Downloads") window.BrowserCommands?.downloadsUI?.();
        else console.warn("Vela: unavailable browser command", command);
      });
      actions.append(button);
      return button;
    }
    const home = action("Home", "Browser:Home", "Open Vela home");
    home.id = "vela-sidebar-home";
    action("Bookmarks", "Browser:ShowAllBookmarks", "Manage bookmarks");
    action("History", "Browser:ShowAllHistory", "Browse history");
    action("Downloads", "Tools:Downloads", "Open downloads");
    const section = document.createXULElement("hbox");
    section.id = "vela-sites-heading";
    const sitesLabel = document.createXULElement("label");
    sitesLabel.setAttribute("value", "Pinned");
    section.append(sitesLabel);
    const pin = document.createXULElement("toolbarbutton");
    pin.id = "vela-pin-site";
    pin.setAttribute("label", "+ Add site");
    pin.setAttribute("tooltiptext", "Pin a website to the sidebar");
    section.append(pin);
    rail.append(section);
    const sites = document.createXULElement("vbox");
    sites.id = "vela-pinned-sites";
    rail.append(sites);
    // Claude's Electron version offers address/name entry. Keep this in
    // privileged browser chrome; never inject a form into web content.
    const pinForm = document.createXULElement("vbox");
    pinForm.id = "vela-add-site-form";
    pinForm.hidden = true;
    const urlLabel = document.createXULElement("label");
    urlLabel.setAttribute("value", "Website address");
    const urlInput = document.createElement("input");
    urlInput.id = "vela-site-url";
    urlInput.type = "url";
    urlInput.placeholder = "https://example.com";
    urlInput.autocomplete = "off";
    urlInput.spellcheck = false;
    const nameLabel = document.createXULElement("label");
    nameLabel.setAttribute("value", "Name (optional)");
    const nameInput = document.createElement("input");
    nameInput.id = "vela-site-name";
    nameInput.placeholder = "Website name";
    nameInput.maxLength = 80;
    nameInput.autocomplete = "off";
    const error = document.createXULElement("label");
    error.id = "vela-site-error";
    error.hidden = true;
    const formActions = document.createXULElement("hbox");
    formActions.id = "vela-site-form-actions";
    const cancel = document.createXULElement("toolbarbutton");
    cancel.setAttribute("label", "Cancel");
    const save = document.createXULElement("toolbarbutton");
    save.setAttribute("label", "Pin site");
    save.className = "vela-site-save";
    formActions.append(cancel, save);
    pinForm.append(urlLabel, urlInput, nameLabel, nameInput, error, formActions);
    rail.append(pinForm);
    const continueHeading = document.createXULElement("label");
    continueHeading.id = "vela-continue-heading";
    continueHeading.setAttribute("value", "Continue · Open tabs");
    rail.append(continueHeading);
    const continueTabs = document.createXULElement("vbox");
    continueTabs.id = "vela-continue-tabs";
    rail.append(continueTabs);
    const PIN_PREF = "vela.sidebar.sites";
    function readSites() {
      try {
        const data = JSON.parse(Services.prefs.getStringPref(PIN_PREF,
          JSON.stringify([{ url: "https://proairetos.com/", title: "Proairetos" }])));
        if (!Array.isArray(data)) return [];
        return data.filter(item => item && typeof item.url === "string" &&
          normalizedSite(item.url) && typeof item.title === "string").slice(0, 20);
      } catch { return []; }
    }
    function saveSites(data) { Services.prefs.setStringPref(PIN_PREF, JSON.stringify(data)); }
    function normalizedSite(url) {
      try {
        const parsed = new URL(url);
        return (parsed.protocol === "https:" || parsed.protocol === "http:") &&
          !parsed.username && !parsed.password && url.length <= 2048;
      } catch { return false; }
    }
    function renderSites() {
      sites.replaceChildren();
      const pinned = readSites();
      if (!pinned.length) {
        const empty = document.createXULElement("label");
        empty.id = "vela-sites-empty";
        empty.setAttribute("value", "Pin sites you visit often");
        sites.append(empty);
      }
      for (const site of pinned) {
        const row = document.createXULElement("hbox");
        row.className = "vela-site-row";
        const mark = document.createXULElement("label");
        mark.className = "vela-site-mark";
        mark.setAttribute("value", site.title.trim().slice(0, 1).toUpperCase() || "•");
        if (new URL(site.url).hostname === "proairetos.com") mark.classList.add("is-proairetos");
        const open = document.createXULElement("toolbarbutton");
        open.className = "vela-site-open";
        open.setAttribute("label", site.title.slice(0, 48));
        open.setAttribute("tooltiptext", site.url);
        open.addEventListener("command", () => window.openTrustedLinkIn(site.url, "tab"));
        const remove = document.createXULElement("toolbarbutton");
        remove.className = "vela-site-remove";
        remove.setAttribute("label", "×");
        remove.setAttribute("tooltiptext", "Unpin " + site.title);
        remove.addEventListener("command", () => {
          saveSites(readSites().filter(item => item.url !== site.url));
          renderSites();
        });
        row.append(mark, open, remove);
        sites.append(row);
      }
    }
    function hidePinForm() {
      pinForm.hidden = true;
      pin.hidden = false;
      error.hidden = true;
    }
    function openPinForm() {
      const current = window.gBrowser?.selectedBrowser;
      const currentUrl = current?.currentURI?.spec || "";
      urlInput.value = normalizedSite(currentUrl) ? currentUrl : "";
      nameInput.value = normalizedSite(currentUrl)
        ? (window.gBrowser?.selectedTab?.label || "").slice(0, 80) : "";
      pin.hidden = true;
      pinForm.hidden = false;
      error.hidden = true;
      urlInput.focus();
      urlInput.select();
    }
    function submitPinnedSite() {
      let address = urlInput.value.trim();
      if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(address)) address = "https://" + address;
      if (!normalizedSite(address)) {
        error.setAttribute("value", "Enter a valid http or https website");
        error.hidden = false;
        return;
      }
      const parsed = new URL(address);
      const canonical = parsed.href;
      const title = nameInput.value.trim().slice(0, 80) || parsed.hostname;
      const pinned = readSites();
      if (!pinned.some(item => item.url === canonical)) {
        pinned.push({ url: canonical, title });
        saveSites(pinned.slice(-20));
      }
      hidePinForm();
      renderSites();
    }
    pin.addEventListener("command", openPinForm);
    cancel.addEventListener("command", hidePinForm);
    save.addEventListener("command", submitPinnedSite);
    for (const input of [urlInput, nameInput]) {
      input.addEventListener("keydown", event => {
        if (event.key === "Enter") { event.preventDefault(); submitPinnedSite(); }
        if (event.key === "Escape") { event.preventDefault(); hidePinForm(); }
      });
    }
    renderSites();
    // Put tools in the sidebar Zen already opens, never in a second panel.
    toolbox.append(rail);
    // Mirror only the tab controls. Firefox keeps ownership of the real tabs.
    // Moving tabbrowser-tabs out of Zen breaks its custom element and hid every tab.
    const strip = document.createXULElement("hbox");
    strip.id = "vela-top-tabs";
    strip.setAttribute("align", "center");
    const tabs = document.createXULElement("hbox");
    tabs.id = "vela-top-tab-items";
    strip.append(tabs);
    const add = document.createXULElement("toolbarbutton");
    add.id = "vela-add-tab";
    add.setAttribute("label", "+");
    add.setAttribute("tooltiptext", "New tab");
    add.addEventListener("command", () => {
      if (window.BrowserCommands?.openTab) window.BrowserCommands.openTab();
      else window.gBrowser?.addTrustedTab?.("about:newtab");
    });
    strip.append(add);
    const nav = document.getElementById("zen-appcontent-navbar-wrapper");
    if (nav?.parentNode) nav.before(strip);
    else toolbox.parentNode?.insertBefore(strip, toolbox);
    let renderPending = false;
    function renderTabs() {
      if (!tabs.isConnected || !window.gBrowser) return;
      const browser = window.gBrowser;
      const visible = Array.from(browser.visibleTabs || browser.tabs || []);
      tabs.replaceChildren();
      // Same browsing session as Firefox, not a parallel Electron tab store.
      continueTabs.replaceChildren();
      const candidates = visible.filter(tab => tab !== browser.selectedTab &&
        !["about:newtab", "about:blank"].includes(tab.linkedBrowser?.currentURI?.spec));
      for (const tab of candidates.slice(-5).reverse()) {
        const button = document.createXULElement("toolbarbutton");
        button.className = "vela-continue-item";
        button.setAttribute("label", (tab.label || "Untitled tab").slice(0, 50));
        button.setAttribute("tooltiptext", tab.label || "Switch to tab");
        button.addEventListener("command", () => { browser.selectedTab = tab; });
        continueTabs.append(button);
      }
      continueHeading.hidden = candidates.length === 0;
      continueTabs.hidden = candidates.length === 0;
      home.setAttribute("aria-current", ["about:home", "about:newtab"].includes(
        browser.selectedBrowser?.currentURI?.spec) ? "page" : "false");
      for (const tab of visible) {
        const item = document.createXULElement("hbox");
        item.className = "vela-tab-item";
        if (tab === browser.selectedTab) item.setAttribute("selected", "true");
        item.setAttribute("tooltiptext", tab.label || "New tab");
        const favicon = document.createXULElement("image");
        favicon.className = "vela-tab-favicon";
        const faviconUrl = tab.getAttribute("image") || "";
        // Reuse Firefox's resolved icon. Only trusted browser schemes or data
        // images are admitted to privileged chrome; never fetch arbitrary URLs.
        if (/^(?:chrome:|resource:|page-icon:|data:image\/)/i.test(faviconUrl)) {
          favicon.setAttribute("src", faviconUrl);
        } else favicon.setAttribute("src", "chrome://browser/content/vela-logo.svg");
        const select = document.createXULElement("toolbarbutton");
        select.className = "vela-tab-select";
        select.setAttribute("label", tab.label || "New tab");
        select.addEventListener("command", () => { browser.selectedTab = tab; });
        const close = document.createXULElement("toolbarbutton");
        close.className = "vela-tab-close";
        close.setAttribute("label", "×");
        close.setAttribute("tooltiptext", "Close tab");
        close.addEventListener("command", () => browser.removeTab(tab));
        select.addEventListener("auxclick", event => {
          if (event.button === 1) { event.preventDefault(); browser.removeTab(tab); }
        });
        item.append(favicon, select, close);
        tabs.append(item);
      }
    }
    function scheduleTabs() {
      if (renderPending) return;
      renderPending = true;
      window.requestAnimationFrame(() => {
        renderPending = false;
        renderTabs();
      });
    }
    let tabContainer = null;
    const events = ["TabOpen", "TabClose", "TabSelect", "TabMove", "TabAttrModified", "TabHide", "TabShow", "TabPinned", "TabUnpinned"];
    let retry = 0;
    function bindTabs() {
      const next = window.gBrowser?.tabContainer;
      if (!next) {
        if (retry++ < 30) window.setTimeout(bindTabs, 300);
        return;
      }
      tabContainer = next;
      for (const event of events) tabContainer.addEventListener(event, scheduleTabs);
      scheduleTabs();
    }
    bindTabs();
    window.addEventListener("unload", () => {
      for (const event of events) tabContainer?.removeEventListener(event, scheduleTabs);
      strip.remove();
    }, { once: true });
    root.setAttribute("vela-top-tabs", "true");
    scheduleTabs();
    // This is the existing Zen sidebar. No separate Tools drawer is created.
    root.setAttribute("vela-sidebar-ready", "true");
    const roles = {
      page:"base", surface:"surface", raised:"raised", text:"text",
      muted:"muted", accent:"accent", border:"border"
    };
    const gtk = {
      page:"window_bg_color", surface:"view_bg_color", raised:"card_bg_color",
      text:"window_fg_color", muted:null, accent:"accent_bg_color", border:"borders"
    };
    let busy = false;
    async function refresh() {
      if (busy || window.closed) return;
      busy = true;
      try {
        const Services = globalThis.Services || ChromeUtils.importESModule("resource://gre/modules/Services.sys.mjs").Services;
        const env = Services.env;
        const config = env.get("XDG_CONFIG_HOME") || PathUtils.join(PathUtils.homeDir, ".config");
        const file = PathUtils.join(config, "gtk-3.0", "gtk.css");
        const info = await IOUtils.stat(file);
        if (info.size > 262144) throw new Error("Theme file too large");
        const css = await IOUtils.readUTF8(file);
        const block = css.match(/\/\* proairetos-session begin:[^]*?\*\/([^]*?)\/\* proairetos-session end \*\//)?.[1];
        if (!block) throw new Error("No active Lamplight palette");
        const values = {};
        for (const [role, key] of Object.entries(gtk)) {
          if (!key) continue;
          const match = block.match(new RegExp("@define-color\\s+"+key+"\\s+(#[0-9a-fA-F]{6});"));
          if (!match) throw new Error("Invalid palette");
          values[role] = match[1];
        }
        root.removeAttribute("vela-palette-warning");
        root.setAttribute("vela-desktop-palette", "true");
        for (const [role, color] of Object.entries(values)) root.style.setProperty("--lamplight-"+roles[role],color,"important");
      } catch (error) {
        if (!root.hasAttribute("vela-palette-warning")) console.warn("Vela: Lamplight palette unavailable", error);
        root.setAttribute("vela-palette-warning", "true");
        root.removeAttribute("vela-desktop-palette");
        for (const role of Object.values(roles)) root.style.removeProperty("--lamplight-"+role);
      } finally { busy = false; }
    }
    refresh();
    const timer = window.setInterval(refresh, 2500);
    window.addEventListener("unload", () => window.clearInterval(timer), {once:true});
  }
  if (document.readyState === "complete") initialize();
  else window.addEventListener("load", initialize, { once: true });
})();
