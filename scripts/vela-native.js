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
    title.setAttribute("value", "Vela");
    title.className = "vela-rail-heading";
    heading.append(title);
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
        if (target && !target.disabled) target.doCommand?.();
        else if (label === "Bookmarks") window.PlacesCommandHook?.showPlacesOrganizer?.("AllBookmarks");
        else if (label === "History") window.PlacesCommandHook?.showPlacesOrganizer?.("History");
        else if (label === "Downloads") window.BrowserCommands?.downloadsUI?.();
        else console.warn("Vela: unavailable browser command", command);
      });
      actions.append(button);
      return button;
    }
    action("Bookmarks", "Browser:ShowAllBookmarks", "Manage bookmarks");
    action("History", "Browser:ShowAllHistory", "Browse history");
    action("Downloads", "Tools:Downloads", "Open downloads");
    const section = document.createXULElement("hbox");
    section.id = "vela-sites-heading";
    const sitesLabel = document.createXULElement("label");
    sitesLabel.setAttribute("value", "Pinned sites");
    section.append(sitesLabel);
    const pin = document.createXULElement("toolbarbutton");
    pin.id = "vela-pin-site";
    pin.setAttribute("label", "+");
    pin.setAttribute("tooltiptext", "Pin current website");
    section.append(pin);
    rail.append(section);
    const sites = document.createXULElement("vbox");
    sites.id = "vela-pinned-sites";
    rail.append(sites);
    const PIN_PREF = "vela.sidebar.sites";
    function readSites() {
      try {
        const data = JSON.parse(Services.prefs.getStringPref(PIN_PREF, "[]"));
        if (!Array.isArray(data)) return [];
        return data.filter(item => item && typeof item.url === "string" &&
          /^https?:\/\//i.test(item.url) && typeof item.title === "string").slice(0, 20);
      } catch { return []; }
    }
    function saveSites(data) { Services.prefs.setStringPref(PIN_PREF, JSON.stringify(data)); }
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
        row.append(open, remove);
        sites.append(row);
      }
    }
    pin.addEventListener("command", () => {
      const current = window.gBrowser?.selectedBrowser;
      const url = current?.currentURI?.spec || "";
      if (!/^https?:\/\//i.test(url) || url.length > 2048) return;
      const title = (window.gBrowser?.selectedTab?.label || new URL(url).hostname).slice(0, 80);
      const pinned = readSites();
      if (!pinned.some(item => item.url === url)) {
        pinned.push({ url, title });
        saveSites(pinned.slice(-20));
        renderSites();
      }
    });
    renderSites();
    const resize = document.createXULElement("box");
    resize.id = "vela-sidebar-resize";
    resize.setAttribute("tooltiptext", "Drag to resize browser tools");
    rail.append(resize);
    const clamp = n => Math.max(190, Math.min(380, n));
    const width = clamp(Services.prefs.getIntPref("vela.sidebar.width", 248));
    root.style.setProperty("--vela-sidebar-width", width + "px");
    resize.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      const initial = event.screenX;
      const startWidth = rail.getBoundingClientRect().width;
      const direction = getComputedStyle(toolbox).direction === "rtl" ? -1 : 1;
      const move = e => root.style.setProperty("--vela-sidebar-width", clamp(startWidth + (e.screenX - initial) * direction) + "px");
      const end = () => {
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", end, true);
        window.removeEventListener("blur", end, true);
        Services.prefs.setIntPref("vela.sidebar.width", clamp(parseInt(root.style.getPropertyValue("--vela-sidebar-width"), 10) || width));
      };
      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", end, true);
      window.addEventListener("blur", end, true);
      event.preventDefault();
    });
    toolbox.append(rail);
    root.setAttribute("vela-sidebar-ready", "true");
    // Reuse Firefox's actual tab nodes: no mirrored tab state or duplicate events.
    // Zen may change its toolbar structure between releases, so fail safely.
    const tabBrowser = document.getElementById("tabbrowser-tabs");
    const nav = document.getElementById("zen-appcontent-navbar-wrapper");
    if (tabBrowser && nav && !document.getElementById("vela-top-tabs")) {
      const originalParent = tabBrowser.parentNode;
      const originalNext = tabBrowser.nextSibling;
      const strip = document.createXULElement("hbox");
      strip.id = "vela-top-tabs";
      strip.setAttribute("align", "center");
      const add = document.createXULElement("toolbarbutton");
      add.id = "vela-add-tab";
      add.setAttribute("label", "+");
      add.setAttribute("tooltiptext", "New tab");
      add.addEventListener("command", () => window.BrowserCommands?.openTab());
      try {
        nav.before(strip);
        strip.append(tabBrowser);
        tabBrowser.setAttribute("orient", "horizontal");
        strip.append(add);
        root.setAttribute("vela-top-tabs", "true");
        window.addEventListener("unload", () => {
          if (originalParent?.isConnected) {
            if (originalNext?.parentNode === originalParent) originalParent.insertBefore(tabBrowser, originalNext);
            else originalParent.append(tabBrowser);
          }
        }, { once: true });
      } catch (error) {
        console.error("Vela horizontal tabs unavailable", error);
        if (originalParent?.isConnected) originalParent.append(tabBrowser);
        strip.remove();
      }
    }
    // Browser tools are independent of the horizontal tab strip.
    const toolsToggle = document.createXULElement("toolbarbutton");
    toolsToggle.id = "vela-tools-toggle";
    toolsToggle.setAttribute("label", "Tools");
    toolsToggle.setAttribute("tooltiptext", "Show or hide browser tools");
    toolsToggle.setAttribute("aria-controls", "vela-native-rail");
    function setCollapsed(collapsed) {
      root.setAttribute("vela-tools-collapsed", String(collapsed));
      toolsToggle.setAttribute("aria-expanded", String(!collapsed));
      Services.prefs.setBoolPref("vela.tools.collapsed", collapsed);
    }
    toolsToggle.addEventListener("command", () => setCollapsed(root.getAttribute("vela-tools-collapsed") !== "true"));
    if (document.getElementById("vela-top-tabs")) document.getElementById("vela-top-tabs").append(toolsToggle);
    else toolbox.append(toolsToggle);
    setCollapsed(Services.prefs.getBoolPref("vela.tools.collapsed", false));
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
