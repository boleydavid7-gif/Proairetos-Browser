/* Vela browser chrome. Loaded only in the privileged browser window (browser.xhtml), never in web content.
 *
 * Builds the parts of the design Zen does not have, around Zen's own toolbar and sidebar:
 *   - #vela-tabstrip: the tab row. It shows Firefox's real tabs (gBrowser), which stay where Zen keeps them;
 *     nothing here moves or replaces tabbrowser-tabs.
 *   - #vela-rail: Home, Bookmarks, History, Downloads, Extensions and Settings, in Zen's collapsed sidebar.
 *   - The grid and Vela buttons on Zen's toolbar, and the color choice (vela.theme.colors: "vela" or "system").
 * Styles: vela-chrome.css. Preferences: prefs/zen/vela.yaml.
 */
(() => {
  "use strict";

  const HOME_PAGES = new Set(["about:home", "about:newtab", "about:blank", "about:privatebrowsing"]);
  const PLACES = {
    downloads: "about:downloads",
    extensions: "about:addons",
    settings: "about:preferences",
  };
  /** Favicons Firefox has already resolved; nothing else is loaded into privileged chrome. */
  const TRUSTED_ICON = /^(?:chrome:|resource:|page-icon:|cached-favicon:|moz-remote-image:|data:image\/)/i;

  function initialize() {
    const root = document.documentElement;
    if (root.getAttribute("windowtype") !== "navigator:browser") return;
    // Pop-ups opened without a toolbar keep Firefox's plain window.
    if (root.getAttribute("chromehidden")?.includes("toolbar")) return;
    if (document.getElementById("vela-tabstrip")) return;
    const toolbox = document.getElementById("navigator-toolbox");
    const appWrapper = document.getElementById("zen-main-app-wrapper");
    if (!toolbox || !appWrapper || !window.gBrowser) return;
    const { Services } = globalThis;
    const cleanups = [];
    window.addEventListener("unload", () => { for (const run of cleanups) run(); }, { once: true });

    const xul = (tag, props = {}) => {
      const element = document.createXULElement(tag);
      for (const [key, value] of Object.entries(props)) {
        if (key === "class") element.className = value;
        else if (key === "id") element.id = value;
        else element.setAttribute(key, value);
      }
      return element;
    };
    const button = (props, onCommand) => {
      const element = xul("toolbarbutton", { class: "vela-icon-button", ...props });
      if (props.label && !props.tooltiptext) element.setAttribute("tooltiptext", props.label);
      element.addEventListener("command", onCommand);
      return element;
    };
    const watchPref = (branch, run) => {
      const observer = { observe: () => run() };
      Services.prefs.addObserver(branch, observer);
      cleanups.push(() => Services.prefs.removeObserver(branch, observer));
    };
    const urlOf = tab => tab?.linkedBrowser?.currentURI?.spec || "";
    const isHome = tab => HOME_PAGES.has(urlOf(tab).split(/[?#]/)[0]) && !tab.hasAttribute("busy");

    root.setAttribute("vela", "true");

    /* ---------- Built-in mods (CSS only, each can be turned off in about:config) ---------- */
    const modPrefs = { "vela.mods.findbar": "vela-mod-findbar", "vela.mods.urlbar": "vela-mod-urlbar", "vela.mods.menus": "vela-mod-menus" };
    const applyMods = () => {
      for (const [pref, attribute] of Object.entries(modPrefs)) root.setAttribute(attribute, String(Services.prefs.getBoolPref(pref, true)));
    };
    applyMods();
    watchPref("vela.mods.", applyMods);

    /* ---------- Tab row ---------- */
    const strip = xul("hbox", { id: "vela-tabstrip" });
    const lead = xul("hbox", { id: "vela-tabstrip-lead" });
    const railToggle = button({ id: "vela-rail-toggle", label: "Hide sidebar" }, () => {
      Services.prefs.setBoolPref("vela.rail.hidden", !Services.prefs.getBoolPref("vela.rail.hidden", false));
    });
    lead.append(railToggle);
    const tabsBox = xul("hbox", { id: "vela-tabs", role: "tablist", "aria-label": "Tabs" });
    const newTab = button({ id: "vela-new-tab", label: "New tab", tooltiptext: "New tab (Ctrl+T)" }, () => {
      if (window.BrowserCommands?.openTab) window.BrowserCommands.openTab();
      else window.gBrowser.addTrustedTab("about:newtab");
    });
    const space = xul("hbox", { id: "vela-tabstrip-space" });
    space.addEventListener("dblclick", event => {
      if (event.target !== space) return;
      if (window.windowState === window.STATE_MAXIMIZED) window.restore(); else window.maximize();
    });
    const controls = xul("hbox", { id: "vela-window-controls" });
    controls.append(
      button({ id: "vela-minimize", label: "Minimize" }, () => window.minimize()),
      button({ id: "vela-maximize", label: "Maximize" }, () => {
        if (window.windowState === window.STATE_MAXIMIZED) window.restore(); else window.maximize();
      }),
      button({ id: "vela-close", label: "Close" }, () => {
        if (window.BrowserCommands?.tryToCloseWindow) window.BrowserCommands.tryToCloseWindow();
        else window.close();
      }),
    );
    strip.append(lead, tabsBox, newTab, space, controls);
    appWrapper.before(strip);
    cleanups.push(() => strip.remove());

    // Our caption buttons show where Firefox draws its own title bar (no window manager frame).
    const ownControls = () => {
      const custom = root.hasAttribute("customtitlebar") || root.hasAttribute("tabsintitlebar") ||
        Services.prefs.getIntPref("browser.tabs.inTitlebar", 1) !== 0;
      root.toggleAttribute("vela-own-controls", custom);
      const maximize = document.getElementById("vela-maximize");
      maximize?.setAttribute("tooltiptext", window.windowState === window.STATE_MAXIMIZED ? "Restore" : "Maximize");
    };
    ownControls();
    window.addEventListener("sizemodechange", ownControls);
    watchPref("browser.tabs.inTitlebar", ownControls);

    const items = new Map();
    const strings = { home: "Vela", byline: "by Proairet", os: "OS" };

    function makeItem(tab) {
      const item = xul("hbox", { class: "vela-tab", role: "tab" });
      const icon = xul("image", { class: "vela-tab-icon" });
      const glyph = xul("toolbarbutton", { class: "vela-icon-button vela-tab-glyph", tabindex: "-1", "aria-hidden": "true" });
      const title = xul("hbox", { class: "vela-tab-title" });
      const label = xul("label", { class: "vela-tab-label" });
      const byline = xul("label", { class: "vela-tab-byline" });
      byline.append(document.createTextNode(strings.byline));
      const os = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
      os.className = "vela-os";
      os.textContent = strings.os;
      byline.append(os);
      title.append(label, byline);
      const close = xul("toolbarbutton", { class: "vela-icon-button vela-tab-close", tooltiptext: "Close tab" });
      close.addEventListener("command", () => window.gBrowser.removeTab(tab, { animate: true }));
      close.addEventListener("mousedown", event => event.stopPropagation());
      item.append(icon, glyph, title, close, xul("box", { class: "vela-tab-corner" }));
      item.velaParts = { icon, glyph, label };
      item.addEventListener("mousedown", event => {
        if (event.button === 0 && !item.hasAttribute("vela-leaving")) window.gBrowser.selectedTab = tab;
      });
      item.addEventListener("auxclick", event => {
        if (event.button === 1) { event.preventDefault(); window.gBrowser.removeTab(tab, { animate: true }); }
      });
      item.addEventListener("dblclick", event => event.stopPropagation());
      item.addEventListener("keydown", event => keyOnTab(event, tab));
      item.addEventListener("contextmenu", event => openTabMenu(event, tab));
      dragging(item, tab);
      item.setAttribute("vela-entering", "true");
      item.addEventListener("animationend", () => item.removeAttribute("vela-entering"), { once: true });
      items.set(tab, item);
      return item;
    }

    function updateItem(item, tab) {
      const { icon, glyph, label } = item.velaParts;
      const selected = tab === window.gBrowser.selectedTab;
      const home = isHome(tab);
      item.toggleAttribute("selected", selected);
      item.setAttribute("aria-selected", String(selected));
      item.setAttribute("tabindex", selected ? "0" : "-1");
      item.toggleAttribute("vela-home", home);
      item.toggleAttribute("pinned", tab.pinned);
      item.toggleAttribute("busy", tab.hasAttribute("busy"));
      const text = home ? strings.home : (tab.label || "New tab");
      if (label.getAttribute("value") !== text) label.setAttribute("value", text);
      item.setAttribute("tooltiptext", home ? "Vela" : (tab.label || "New tab"));
      const image = tab.getAttribute("image") || "";
      const own = !home && TRUSTED_ICON.test(image);
      if (own && icon.getAttribute("src") !== image) icon.setAttribute("src", image);
      if (!own) icon.removeAttribute("src");
      // A page with no icon of its own shows a globe; the home page shows the Vela mark.
      icon.hidden = !own && !home;
      glyph.hidden = own || home;
    }

    function visibleTabs() {
      const browser = window.gBrowser;
      return Array.from(browser.visibleTabs || browser.tabs || []).filter(tab => !tab.closing && !tab.hidden);
    }

    function leave(item) {
      if (item.hasAttribute("vela-leaving")) return;
      item.setAttribute("vela-leaving", "true");
      item.removeAttribute("selected");
      const done = () => item.remove();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) { done(); return; }
      item.addEventListener("animationend", done, { once: true });
      window.setTimeout(done, 400);
    }

    function renderTabs() {
      if (!tabsBox.isConnected) return;
      const tabs = visibleTabs();
      const wanted = new Set(tabs);
      for (const [tab, item] of items) {
        if (!wanted.has(tab)) { items.delete(tab); leave(item); }
      }
      let previous = null;
      for (const tab of tabs) {
        const item = items.get(tab) || makeItem(tab);
        updateItem(item, tab);
        const next = previous ? previous.nextSibling : tabsBox.firstChild;
        if (next !== item) tabsBox.insertBefore(item, next);
        previous = item;
      }
      const selected = items.get(window.gBrowser.selectedTab);
      if (selected && !dragState) selected.scrollIntoView({ block: "nearest", inline: "nearest" });
      updateRail();
    }

    let pending = false;
    function scheduleTabs() {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(() => { pending = false; renderTabs(); });
    }

    function keyOnTab(event, tab) {
      const tabs = visibleTabs();
      const index = tabs.indexOf(tab);
      let target = -1;
      if (event.key === "ArrowRight") target = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft") target = (index + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") target = 0;
      else if (event.key === "End") target = tabs.length - 1;
      else if (event.key === "Delete") { event.preventDefault(); window.gBrowser.removeTab(tab, { animate: true }); return; }
      if (target < 0) return;
      event.preventDefault();
      window.gBrowser.selectedTab = tabs[target];
      window.requestAnimationFrame(() => items.get(tabs[target])?.focus());
    }

    // Firefox's own tab menu (Reload, Duplicate, Pin, Move, Close others…), for the tab that was right-clicked.
    function openTabMenu(event, tab) {
      const menu = document.getElementById("tabContextMenu");
      if (!menu) return;
      event.preventDefault();
      if (window.TabContextMenu) window.TabContextMenu.contextTab = tab;
      const realTab = tab;
      const onShowing = popupEvent => {
        if (popupEvent.target !== menu) return;
        if (window.TabContextMenu) window.TabContextMenu.contextTab = realTab;
      };
      menu.addEventListener("popupshowing", onShowing, { once: true, capture: true });
      menu.openPopupAtScreen(event.screenX, event.screenY, true, event);
    }
    // The tab menu reads the tab from what was clicked; point it at the real tab.
    const tabMenu = document.getElementById("tabContextMenu");
    if (tabMenu && window.TabContextMenu?.updateContextMenu) {
      const original = window.TabContextMenu.updateContextMenu.bind(window.TabContextMenu);
      window.TabContextMenu.updateContextMenu = function (popup) {
        const trigger = popup.triggerNode?.closest?.(".vela-tab");
        if (trigger) {
          const tab = [...items].find(([, item]) => item === trigger)?.[0];
          if (tab) {
            Object.defineProperty(popup, "triggerNode", { value: tab, configurable: true });
            try { return original(popup); } finally { delete popup.triggerNode; }
          }
        }
        return original(popup);
      };
    }

    // Drag a tab sideways to move it among the others.
    let dragState = null;
    function dragging(item, tab) {
      item.addEventListener("pointerdown", event => {
        if (event.button !== 0 || event.target.closest(".vela-tab-close")) return;
        dragState = { item, tab, startX: event.clientX, moved: false, pointer: event.pointerId };
      });
      item.addEventListener("pointermove", event => {
        if (!dragState || dragState.item !== item) return;
        const dx = event.clientX - dragState.startX;
        if (!dragState.moved && Math.abs(dx) < 6) return;
        if (!dragState.moved) { dragState.moved = true; item.setPointerCapture(dragState.pointer); item.setAttribute("vela-dragging", "true"); }
        item.style.transform = `translateX(${dx}px)`;
      });
      const finish = event => {
        if (!dragState || dragState.item !== item) return;
        const state = dragState;
        dragState = null;
        item.style.transform = "";
        item.removeAttribute("vela-dragging");
        if (!state.moved) return;
        const others = [...tabsBox.children].filter(other => other !== item && !other.hasAttribute("vela-leaving"));
        let index = others.findIndex(other => {
          const box = other.getBoundingClientRect();
          return event.clientX < box.left + box.width / 2;
        });
        if (index < 0) index = others.length;
        const tabs = visibleTabs();
        const targetTab = tabs.filter(other => other !== tab)[index];
        const position = targetTab ? targetTab._tPos : tabs[tabs.length - 1]._tPos + 1;
        const to = position > tab._tPos ? position - 1 : position;
        if (to === tab._tPos) return;
        try { window.gBrowser.moveTabTo(tab, { tabIndex: to }); } catch {
          try { window.gBrowser.moveTabTo(tab, to); } catch (error) { console.warn("Vela: could not move the tab", error); }
        }
      };
      item.addEventListener("pointerup", finish);
      item.addEventListener("pointercancel", finish);
    }

    const tabEvents = ["TabOpen", "TabClose", "TabSelect", "TabMove", "TabAttrModified", "TabHide", "TabShow", "TabPinned", "TabUnpinned"];
    const container = window.gBrowser.tabContainer;
    for (const name of tabEvents) container.addEventListener(name, scheduleTabs);
    cleanups.push(() => { for (const name of tabEvents) container.removeEventListener(name, scheduleTabs); });
    const progress = { onLocationChange: () => scheduleTabs(), onStateChange: () => scheduleTabs() };
    window.gBrowser.addTabsProgressListener(progress);
    cleanups.push(() => window.gBrowser.removeTabsProgressListener(progress));
    // Zen's spaces show and hide tabs as one moves between them.
    window.addEventListener("ZenWorkspaceChanged", scheduleTabs);
    window.addEventListener("ZenWorkspacesUIUpdate", scheduleTabs);

    /* ---------- Rail ---------- */
    const rail = xul("vbox", { id: "vela-rail", role: "toolbar", "aria-label": "Vela", orient: "vertical" });
    const light = xul("box", { id: "vela-rail-light" });
    const openPlace = place => {
      const url = PLACES[place];
      if (place === "settings" && window.openPreferences) { window.openPreferences(); return; }
      if (place === "extensions" && window.BrowserAddonUI?.openAddonsMgr) { window.BrowserAddonUI.openAddonsMgr(); return; }
      window.switchToTabHavingURI(url, true, { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });
    };
    const sidebar = id => {
      const controller = window.SidebarController;
      if (controller?.toggle) { controller.toggle(id); return; }
      window.PlacesCommandHook?.showPlacesOrganizer?.(id === "viewHistorySidebar" ? "History" : "AllBookmarks");
    };
    const railButtons = {
      home: button({ id: "vela-rail-home", class: "vela-icon-button vela-rail-button", label: "Home" }, () => {
        const tab = window.gBrowser.selectedTab;
        if (!isHome(tab)) window.openTrustedLinkIn("about:home", "current");
      }),
      bookmarks: button({ id: "vela-rail-bookmarks", class: "vela-icon-button vela-rail-button", label: "Bookmarks" }, () => sidebar("viewBookmarksSidebar")),
      history: button({ id: "vela-rail-history", class: "vela-icon-button vela-rail-button", label: "History" }, () => sidebar("viewHistorySidebar")),
      downloads: button({ id: "vela-rail-downloads", class: "vela-icon-button vela-rail-button", label: "Downloads" }, () => openPlace("downloads")),
      extensions: button({ id: "vela-rail-extensions", class: "vela-icon-button vela-rail-button", label: "Extensions" }, () => openPlace("extensions")),
    };
    const settings = button({ id: "vela-rail-settings", class: "vela-icon-button vela-rail-button", label: "Settings" }, () => openPlace("settings"));
    rail.append(light, ...Object.values(railButtons), xul("box", { id: "vela-rail-spacer" }), xul("box", { id: "vela-rail-separator" }), settings);
    toolbox.append(rail);
    cleanups.push(() => rail.remove());

    function currentPlace() {
      const controller = window.SidebarController;
      if (controller?.isOpen) {
        if (controller.currentID === "viewBookmarksSidebar") return "bookmarks";
        if (controller.currentID === "viewHistorySidebar") return "history";
      }
      const tab = window.gBrowser.selectedTab;
      if (isHome(tab)) return "home";
      const url = urlOf(tab).split(/[?#]/)[0];
      for (const [place, address] of Object.entries(PLACES)) if (url === address) return place;
      return null;
    }

    function updateRail() {
      const place = currentPlace();
      const all = { ...railButtons, settings };
      let lit = null;
      for (const [name, element] of Object.entries(all)) {
        const current = name === place;
        element.setAttribute("aria-current", String(current));
        if (current) lit = element;
      }
      rail.toggleAttribute("vela-lit", Boolean(lit));
      if (lit) light.style.setProperty("--vela-light-y", `${lit.offsetTop}px`);
      if (!rail.hasAttribute("vela-ready")) window.requestAnimationFrame(() => rail.setAttribute("vela-ready", "true"));
    }
    window.addEventListener("SidebarShown", updateRail);
    window.addEventListener("SidebarFocused", updateRail);
    document.getElementById("sidebar-box")?.addEventListener("command", () => window.setTimeout(updateRail, 0));
    const sidebarBox = document.getElementById("sidebar-box");
    if (sidebarBox) {
      const sidebarWatch = new MutationObserver(() => updateRail());
      sidebarWatch.observe(sidebarBox, { attributes: true, attributeFilter: ["hidden", "sidebarcommand", "checked"] });
      cleanups.push(() => sidebarWatch.disconnect());
    }
    window.addEventListener("resize", () => window.requestAnimationFrame(updateRail));

    const applyRail = () => root.toggleAttribute("vela-rail-hidden", Services.prefs.getBoolPref("vela.rail.hidden", false));
    applyRail();
    watchPref("vela.rail.hidden", () => {
      applyRail();
      railToggle.setAttribute("tooltiptext", root.hasAttribute("vela-rail-hidden") ? "Show sidebar" : "Hide sidebar");
    });

    /* ---------- Toolbar: grid and Vela buttons ---------- */
    const navBar = document.getElementById("nav-bar");
    const grid = xul("toolbarbutton", {
      id: "vela-grid-button", class: "toolbarbutton-1 chromeclass-toolbar-additional",
      label: "All tabs", tooltiptext: "All tabs", removable: "false", "aria-haspopup": "dialog",
    });
    // The grid opens every tab as a list (Firefox's own list needs a button Zen hides).
    const allTabs = xul("panel", { id: "vela-all-tabs", type: "arrow", role: "dialog", "aria-label": "All tabs" });
    const allTabsList = xul("vbox", { id: "vela-all-tabs-list", role: "listbox" });
    allTabs.append(allTabsList);
    (document.getElementById("mainPopupSet") || document.documentElement).append(allTabs);
    cleanups.push(() => allTabs.remove());
    function fillAllTabs() {
      allTabsList.replaceChildren();
      for (const tab of visibleTabs()) {
        const row = xul("hbox", { class: "vela-all-tabs-row", align: "center" });
        const open = xul("toolbarbutton", { class: "subviewbutton subviewbutton-iconic vela-all-tabs-open", role: "option", crop: "end" });
        const home = isHome(tab);
        const image = tab.getAttribute("image") || "";
        open.setAttribute("label", home ? strings.home : (tab.label || "New tab"));
        open.setAttribute("image", home ? "chrome://browser/content/vela-logo.svg"
          : TRUSTED_ICON.test(image) ? image : "chrome://browser/content/vela-icons/page.svg");
        open.setAttribute("aria-selected", String(tab === window.gBrowser.selectedTab));
        if (tab === window.gBrowser.selectedTab) row.setAttribute("selected", "true");
        open.addEventListener("command", () => { window.gBrowser.selectedTab = tab; allTabs.hidePopup(); });
        const close = xul("toolbarbutton", { class: "vela-icon-button vela-all-tabs-close", tooltiptext: "Close tab" });
        close.addEventListener("command", () => {
          window.gBrowser.removeTab(tab, { animate: true });
          row.remove();
          if (!allTabsList.querySelector(".vela-all-tabs-row")) allTabs.hidePopup();
        });
        row.append(open, close);
        allTabsList.append(row);
      }
      const add = xul("toolbarbutton", { class: "subviewbutton subviewbutton-iconic vela-all-tabs-new", label: "New tab",
        image: "chrome://browser/content/vela-icons/plus.svg" });
      add.addEventListener("command", () => { allTabs.hidePopup(); newTab.doCommand(); });
      allTabsList.append(xul("toolbarseparator"), add);
    }
    grid.addEventListener("command", () => {
      if (allTabs.state === "open" || allTabs.state === "showing") { allTabs.hidePopup(); return; }
      fillAllTabs();
      allTabs.openPopup(grid, "after_start", 0, 2);
    });
    const separator = xul("box", { id: "vela-toolbar-separator" });
    const velaButton = xul("toolbarbutton", {
      id: "vela-menu-button", class: "toolbarbutton-1 chromeclass-toolbar-additional",
      type: "menu", label: "Vela", tooltiptext: "Vela", removable: "false",
    });
    const menu = xul("menupopup", { id: "vela-menu", position: "after_end" });
    const colorsHeading = xul("menucaption", { label: "Colors" });
    const velaColors = xul("menuitem", { type: "radio", name: "vela-colors", label: "Vela colors", value: "vela" });
    const systemColors = xul("menuitem", { type: "radio", name: "vela-colors", label: "Match system colors", value: "system" });
    for (const item of [velaColors, systemColors]) {
      item.addEventListener("command", () => Services.prefs.setStringPref("vela.theme.colors", item.getAttribute("value")));
    }
    const openProairetos = xul("menuitem", { label: "Open Proairetos" });
    openProairetos.addEventListener("command", () => window.openTrustedLinkIn("https://proairetos.com/", "tab"));
    const openSettings = xul("menuitem", { label: "Settings" });
    openSettings.addEventListener("command", () => openPlace("settings"));
    menu.append(colorsHeading, velaColors, systemColors, xul("menuseparator"), openProairetos, openSettings);
    velaButton.append(menu);

    function placeToolbarButtons() {
      const target = document.getElementById("nav-bar-customization-target");
      const panelButton = document.getElementById("PanelUI-button");
      if (target && grid.nextSibling !== target) target.before(grid);
      if (panelButton && velaButton.nextSibling !== panelButton) panelButton.before(velaButton);
      if (velaButton.previousSibling !== separator) velaButton.before(separator);
    }
    placeToolbarButtons();
    // Zen rebuilds the toolbar when its layout settings change; put the buttons back where they belong.
    if (navBar) {
      const toolbarWatch = new MutationObserver(() => placeToolbarButtons());
      toolbarWatch.observe(navBar, { childList: true });
      cleanups.push(() => toolbarWatch.disconnect());
    }
    cleanups.push(() => { grid.remove(); separator.remove(); velaButton.remove(); });

    /* ---------- Colors ---------- */
    const lamplightRoles = { page: "base", surface: "surface", raised: "raised", text: "text", accent: "accent" };
    const gtkNames = { page: "window_bg_color", surface: "view_bg_color", raised: "card_bg_color", text: "window_fg_color", accent: "accent_bg_color" };
    let paletteTimer = 0;
    let reading = false;

    function clearPalette() {
      root.removeAttribute("vela-desktop-palette");
      for (const role of Object.values(lamplightRoles)) root.style.removeProperty("--lamplight-" + role);
    }

    // The ProairetOS session writes its Lamplight colors into GTK's user stylesheet; read them when present.
    async function readDesktopPalette() {
      if (reading || window.closed) return;
      reading = true;
      try {
        // The home folder comes from the directory service (PathUtils has no home folder in this Firefox).
        const home = Services.dirsvc.get("Home", Ci.nsIFile).path;
        const config = Services.env.get("XDG_CONFIG_HOME") || PathUtils.join(home, ".config");
        const file = PathUtils.join(config, "gtk-3.0", "gtk.css");
        if (!(await IOUtils.exists(file))) { clearPalette(); return; }
        const info = await IOUtils.stat(file);
        if (info.size > 262144) { clearPalette(); return; }
        const css = await IOUtils.readUTF8(file);
        const block = css.match(/\/\* proairetos-session begin:[^]*?\*\/([^]*?)\/\* proairetos-session end \*\//)?.[1];
        if (!block) { clearPalette(); return; }
        const values = {};
        for (const [role, name] of Object.entries(gtkNames)) {
          const match = block.match(new RegExp("@define-color\\s+" + name + "\\s+(#[0-9a-fA-F]{6});"));
          if (!match) { clearPalette(); return; }
          values[role] = match[1];
        }
        for (const [role, color] of Object.entries(values)) root.style.setProperty("--lamplight-" + lamplightRoles[role], color);
        root.setAttribute("vela-desktop-palette", "true");
      } catch (error) {
        clearPalette();
        console.warn("Vela: could not read the ProairetOS palette", error);
      } finally {
        reading = false;
      }
    }

    function applyColors() {
      const mode = Services.prefs.getStringPref("vela.theme.colors", "vela") === "system" ? "system" : "vela";
      root.setAttribute("vela-colors", mode);
      velaColors.setAttribute("checked", String(mode === "vela"));
      systemColors.setAttribute("checked", String(mode === "system"));
      window.clearInterval(paletteTimer);
      if (mode === "system") {
        readDesktopPalette();
        paletteTimer = window.setInterval(readDesktopPalette, 3000);
      } else {
        clearPalette();
      }
    }
    applyColors();
    watchPref("vela.theme.colors", applyColors);
    cleanups.push(() => window.clearInterval(paletteTimer));

    renderTabs();
    root.setAttribute("vela-ready", "true");
  }

  if (document.readyState === "complete") initialize();
  else window.addEventListener("load", initialize, { once: true });
})();
