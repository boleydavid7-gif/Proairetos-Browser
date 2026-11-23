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
    const rail = document.createXULElement("vbox");
    rail.id = "vela-native-rail";
    const heading = document.createXULElement("label");
    heading.setAttribute("value", "Vela");
    heading.className = "vela-rail-heading";
    rail.append(heading);
    for (const [label, command] of [
      ["History", "Browser:ShowAllHistory"],
      ["Bookmarks", "Browser:ShowAllBookmarks"],
      ["Downloads", "Tools:Downloads"],
    ]) {
      const target = document.getElementById(command);
      if (!target) continue;
      const button = document.createXULElement("toolbarbutton");
      button.setAttribute("label", label);
      button.setAttribute("command", command);
      rail.append(button);
    }
    toolbox.append(rail);
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
    // The sidebar is a separate set of native browser tools, not another tab list.
    rail.setAttribute("aria-label", "Browser tools");
    const toolsToggle = document.createXULElement("toolbarbutton");
    toolsToggle.id = "vela-tools-toggle";
    toolsToggle.setAttribute("label", "Tools");
    toolsToggle.setAttribute("tooltiptext", "Show or hide browser tools");
    toolsToggle.addEventListener("command", () => {
      const collapsed = root.getAttribute("vela-tools-collapsed") === "true";
      root.setAttribute("vela-tools-collapsed", String(!collapsed));
      try {
        const Services = globalThis.Services || ChromeUtils.importESModule("resource://gre/modules/Services.sys.mjs").Services;
        Services.prefs.setBoolPref("vela.tools.collapsed", !collapsed);
      } catch (error) { console.warn("Vela tools preference unavailable", error); }
    });
    toolbox.append(toolsToggle);
    toolsToggle.setAttribute("aria-controls", "vela-native-rail");
    try {
      const Services = globalThis.Services || ChromeUtils.importESModule("resource://gre/modules/Services.sys.mjs").Services;
      root.setAttribute("vela-tools-collapsed", String(Services.prefs.getBoolPref("vela.tools.collapsed", false)));
    } catch { root.setAttribute("vela-tools-collapsed", "false"); }
    // Keep the tools visible even if Zen collapses its original tab sidebar.
    // Expose browser-owned panels rather than duplicating bookmark/history data.
    const library = document.createXULElement("toolbarbutton");
    library.setAttribute("label", "Library");
    library.setAttribute("tooltiptext", "Manage bookmarks, history and downloads");
    library.addEventListener("command", () => window.PlacesCommandHook?.showPlacesOrganizer?.("AllBookmarks"));
    rail.append(library);
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
