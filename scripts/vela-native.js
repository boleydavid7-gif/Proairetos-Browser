/* Loaded only in the privileged browser window, never in web content. */
(() => {
  "use strict";
  window.addEventListener("load", () => {
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
        const { Services } = ChromeUtils.importESModule("resource://gre/modules/Services.sys.mjs");
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
        for (const [role, color] of Object.entries(values)) root.style.setProperty("--lamplight-"+roles[role],color,"important");
      } catch {
        for (const role of Object.values(roles)) root.style.removeProperty("--lamplight-"+role);
      } finally { busy = false; }
    }
    refresh();
    const timer = window.setInterval(refresh, 2500);
    window.addEventListener("unload", () => window.clearInterval(timer), {once:true});
  }, {once:true});
})();
