(() => {
  "use strict";
  if (window.__meelandBadgesLoaded) return;
  window.__meelandBadgesLoaded = true;

  /*
   * Meeland Client custom badge integration (v2).
   * Install at: data/cache/.ms/meeland-badges.js
   *
   * Supabase rows: username, badge, badge_url      badge: star | contentcreator | verified
   *
   * Client-side only: other players without this script won't see the badges.
   *
   * How it hooks into the game (traced from the game's own code):
   *  - Nametags: player entities in networkManager.playerArray each carry an
   *    `enemy` script with a `badgeEntity` (its children are the built-in icons).
   *  - Tab list: OverlayManager.renderTab() rebuilds every row; we wrap it so
   *    badges are applied right after each rebuild. Row username is read from
   *    slot.script.button.argument (the visible text is shortened).
   *  - Chat: the game builds one text element per message and enables a child
   *    "Badge-<role>" for staff. We listen to OverlayManager:ChatMessage (after
   *    the game's own handler), pad the name and add a cloned badge icon.
   * Badge icons are CLONES of a built-in badge so layer/size/position are right;
   * only the texture is swapped.
   */
  const CONFIG = {
    SUPABASE_URL: "https://ebudyzpbumzoriuvilgz.supabase.co",
    // Paste your Supabase project's PUBLIC anon/publishable key here.
    // Never use the service_role/secret key in a client userscript.
    SUPABASE_ANON_KEY: "sb_publishable_oVHIyZUS3S0WS-gsvoGAZw_qoJnm-NQ",
    TABLE: "client_badges",
    REFRESH_MS: 60000,
    SCAN_MS: 1000,
    FALLBACK_SIZE: 18,        // only used if no built-in badge exists to clone
    REPLACE_BUILTIN: true,    // true: custom badge replaces Admin/Mod icon; false: shows alongside
    CHAT_PAD: "      ",       // same 6-space gap the game uses for its own chat badges
    ALLOWED: new Set(["star", "contentcreator", "verified"]),
    ALIASES: { streamer: "contentcreator" },   // old rows saved as "streamer" still work

    // Player name colours per badge (nametag, tab list, chat).
    // { solid: "#rrggbb" } or { gradient: ["#from", "#to"] } (blended per letter).
    COLOR_NAMES: true,
    NAME_STYLE: {
      star:     { gradient: ["#fed200", "#fe6000"] },                     // soft yellow
      contentcreator: { gradient: ["#ec0f25", "#fc706b"] },    // Twitch purple
      verified: { gradient: ["#ffb992", "#ff7e34"] }      // soft pink -> soft purple
    }
  };

  const CUSTOM = "MeelandCustomBadge";
  const live = new Set();   // {node, tex, container, prefix} - re-enforced every frame
  const nameLive = new Map(); // player entity -> {el, badge}, name style re-enforced every frame
  const state = {
    assignments: new Map(),
    textures: new Map(),   // url -> Promise<Texture|null>
    overlay: null,
    wrappedProto: null,
    chatApp: null,
    enforceApp: null,
    started: false,
    lastError: ""
  };

  const norm = v => String(v ?? "").trim().toLowerCase();
  const log = (...a) => console.log("[Meeland Badges]", ...a);
  const warn = (...a) => console.warn("[Meeland Badges]", ...a);

  const configured = () =>
    !!CONFIG.SUPABASE_URL && !!CONFIG.SUPABASE_ANON_KEY &&
    !CONFIG.SUPABASE_ANON_KEY.includes("PASTE_PUBLIC");

  // ---------------------------------------------------------------- data
  async function loadBadges() {
    if (!configured()) {
      log("Not configured: paste the Supabase public anon/publishable key into meeland-badges.js.");
      return;
    }
    try {
      const endpoint = CONFIG.SUPABASE_URL.replace(/\/+$/, "") +
        "/rest/v1/" + encodeURIComponent(CONFIG.TABLE) +
        "?select=username,badge,badge_url";
      const res = await fetch(endpoint, {
        cache: "no-store",
        headers: {
          apikey: CONFIG.SUPABASE_ANON_KEY,
          Authorization: "Bearer " + CONFIG.SUPABASE_ANON_KEY
        }
      });
      if (!res.ok) throw new Error("Supabase HTTP " + res.status);
      const rows = await res.json();
      const next = new Map();
      for (const row of rows) {
        const username = norm(row.username);
        let badge = norm(row.badge);
        badge = CONFIG.ALIASES[badge] || badge;
        const url = String(row.badge_url || "").trim();
        if (!CONFIG.ALLOWED.has(badge)) {
          warn("Skipping row with unknown badge name:", row.username, "->", row.badge);
          continue;
        }
        if (!username || !url) continue;
        try {
          const p = new URL(url);
          if (p.protocol !== "https:" && p.protocol !== "http:") continue;
        } catch { continue; }
        next.set(username, { badge, url });
      }
      state.assignments = next;
      state.lastError = "";
      log("Loaded", next.size, "badge assignment(s).");
      scanAll();
    } catch (err) {
      state.lastError = String(err?.message || err);
      console.error("[Meeland Badges] Supabase load failed:", err);
    }
  }

  // ---------------------------------------------------------- game lookups
  function getApp() {
    const pc = window.pc;
    if (!pc) return null;
    try {
      return pc.app ||
        pc.AppBase?.getApplication?.() ||
        pc.Application?.getApplication?.() ||
        window.GameGlobals?.networkManagerEntity?.script?.networkManager?.app ||
        null;
    } catch { return null; }
  }

  function getPlayers() {
    try {
      const nm = window.GameGlobals?.networkManagerEntity?.script?.networkManager;
      return Array.isArray(nm?.playerArray) ? nm.playerArray : [];
    } catch { return []; }
  }

  function findOverlay() {
    const app = getApp();
    if (!app) return null;
    if (state.overlay?.entity?.script?.overlayManager === state.overlay) return state.overlay;
    state.overlay = null;
    try {
      for (const sc of app.root.findComponents("script")) {
        const m = sc.entity?.script?.overlayManager;
        if (m) { state.overlay = m; return m; }
      }
    } catch {}
    return null;
  }

  // -------------------------------------------------------------- textures
  function loadTexture(url) {
    if (state.textures.has(url)) return state.textures.get(url);
    const p = new Promise(resolve => {
      const pc = window.pc;
      const app = getApp();
      if (!pc || !app?.graphicsDevice) return resolve(null);
      const img = new Image();
      img.crossOrigin = "anonymous"; // host must send CORS headers (Supabase public buckets do)
      img.onload = () => {
        try {
          const tex = new pc.Texture(app.graphicsDevice, {
            name: "meeland-badge",
            width: img.naturalWidth || 32,
            height: img.naturalHeight || 32,
            format: pc.PIXELFORMAT_RGBA8 ?? pc.PIXELFORMAT_R8_G8_B8_A8,
            mipmaps: false,
            minFilter: pc.FILTER_LINEAR,
            magFilter: pc.FILTER_LINEAR,
            addressU: pc.ADDRESS_CLAMP_TO_EDGE,
            addressV: pc.ADDRESS_CLAMP_TO_EDGE
          });
          tex.setSource(img);
          resolve(tex);
        } catch (e) { warn("Texture creation failed:", e); resolve(null); }
      };
      img.onerror = () => { warn("Badge image failed to load (CORS or bad URL?):", url); resolve(null); };
      img.src = url;
    });
    state.textures.set(url, p);
    // Don't cache failures forever
    p.then(t => { if (!t) state.textures.delete(url); });
    return p;
  }

  // ------------------------------------------------------------ name colours
  const stripMarkup = t => String(t ?? "").replace(/\[\/?color[^\]]*\]/g, "");
  const hexRgb = h => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h) || [0, "ffffff"];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgbHex = (r, g, b) => "#" + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
  function blend(a, b, t) {
    const x = hexRgb(a), y = hexRgb(b);
    return rgbHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  }
  const styleFor = badge => (CONFIG.COLOR_NAMES && CONFIG.NAME_STYLE[badge]) || null;

  // Returns PlayCanvas text markup for `plain` in the given style.
  function colorize(plain, style) {
    const clean = String(plain ?? "").replace(/[\[\]]/g, "");
    if (style.solid) return '[color="' + style.solid + '"]' + clean + "[/color]";
    const [c0, c1] = style.gradient;
    const chars = [...clean];
    return chars.map((ch, i) => ch.trim() === "" ? ch :
      '[color="' + blend(c0, c1, chars.length > 1 ? i / (chars.length - 1) : 0) + '"]' + ch + "[/color]").join("");
  }

  // Styles a text element (nametag / tab row). Solid -> element.color, gradient -> markup.
  function styleElement(el, badge) {
    const style = styleFor(badge);
    if (!el || !style || el.text === undefined) return;
    const pc = window.pc;
    const plain = stripMarkup(el.text);
    if (style.solid || !("enableMarkup" in el)) {
      const [r, g, b] = hexRgb(style.solid || style.gradient[0]);
      if (/\[color/.test(el.text)) el.text = plain;
      el.color = new pc.Color(r / 255, g / 255, b / 255, el.color?.a ?? 1);
    } else {
      if (!el.enableMarkup) el.enableMarkup = true;
      const want = colorize(plain, style);
      if (el.text !== want) el.text = want;
    }
  }

  // ------------------------------------------------------- badge rendering
  function builtinChildren(container, prefix) {
    return (container.children || []).filter(c =>
      c.name !== CUSTOM && (!prefix || String(c.name).startsWith(prefix)));
  }

  function makeFallback(container) {
    const pc = window.pc;
    try {
      const e = new pc.Entity(CUSTOM);
      e.addComponent("element", {
        type: pc.ELEMENTTYPE_IMAGE,
        anchor: [0.5, 0.5, 0.5, 0.5], pivot: [0.5, 0.5],
        width: CONFIG.FALLBACK_SIZE, height: CONFIG.FALLBACK_SIZE, useInput: false
      });
      return e;
    } catch (err) { warn("Fallback entity failed:", err); return null; }
  }

  // Built-in badges are nested: e.g. Admin > "Untitled" + "ImageAdmin".
  // Evidence from the game: in the TAB LIST / CHAT the parent element is what
  // draws, so we texture the parent ("flat" mode) and merely disable (never
  // destroy) the inner images. In the WORLD NAMETAG the visible icon is the
  // nested Image* element, so we texture that one ("nested" mode) and leave the
  // rest of the structure exactly as the game built it.
  function imageNodes(root) {
    const out = [];
    (function walk(n) {
      if (n.element && n.element.type === "image") out.push(n);
      for (const c of n.children || []) walk(c);
    })(root);
    return out;
  }

  function prepareClone(node, mode) {
    const nested = imageNodes(node).filter(n => n !== node);
    let target = node;
    if (mode === "nested") {
      target = nested.find(n => /^image/i.test(n.name)) || node;
      for (let n = target; n && n !== node; n = n.parent) n.enabled = true; // icon chain on
      if (target !== node) target.name = "MeelandBadgeImage"; // not matched by name-based swappers
    } else {
      for (const c of node.children || []) c.enabled = false; // hide, don't destroy
    }
    for (const n of new Set([node, target])) {
      const el = n.element;
      if (!el) continue;
      try { el.spriteAsset = null; } catch {}
      try { el.textureAsset = null; } catch {}
      try { el.useInput = false; } catch {}
    }
    return target;
  }

  // Chat badges were rendering as a plain black disc: the cloned chat badge
  // keeps whatever tint/sprite/crop the game left on it, and an image element
  // multiplies its texture by its colour, so a black colour (or a leftover
  // sprite) hides our icon. Reset the clone to "draw this texture as-is".
  function resetTint(n) {
    const el = n?.element, pc = window.pc;
    if (!el || !pc) return;
    try { el.sprite = null; } catch {}
    try { el.color = new pc.Color(1, 1, 1, 1); } catch {}
    try { el.opacity = 1; } catch {}
    try { el.rect = new pc.Vec4(0, 0, 1, 1); } catch {}
    try { el.mask = false; } catch {}
  }

  function paint(node, target, tex) {
    if (node.element) node.element.texture = tex;
    if (target && target !== node && target.element) target.element.texture = tex;
  }

  // Puts the custom icon into `container`. `prefix` limits which children count
  // as built-in badges (chat rows have other children; nametag/tab don't).
  // opts.mode: "flat" (tab/chat) | "nested" (nametag). opts.persist: re-assert
  // every frame (nametags only).
  async function setCustomBadge(container, assignment, prefix, opts = {}) {
    try {
      if (!container) return false;
      let node = container.findByName?.(CUSTOM);
      if (!assignment) { if (node) node.enabled = false; return false; }

      if (!node) {
        const tpl = builtinChildren(container, prefix).find(c => c.element);
        node = tpl ? tpl.clone() : makeFallback(container);
        if (!node) return false;
        node.name = CUSTOM;
        node.enabled = false;           // never show a built-in texture
        node._mcbTarget = tpl ? prepareClone(node, opts.mode || "flat") : node;
        if (opts.resetTint) { resetTint(node); resetTint(node._mcbTarget); }
        container.addChild(node);
      }
      if (CONFIG.REPLACE_BUILTIN) for (const c of builtinChildren(container, prefix)) c.enabled = false;

      const tex = await loadTexture(assignment.url);
      const target = node._mcbTarget || node;
      if (!tex || !node.element) return false;
      paint(node, target, tex);
      node.enabled = true;

      if (opts.persist) {
        for (const e of live) if (e.node === node) { e.tex = tex; e.container = container; e.prefix = prefix; return true; }
        live.add({ node, target, tex, container, prefix });
      }
      return true;
    } catch (err) {
      warn("setCustomBadge failed:", err);
      return false;
    }
  }

  // Runs right before each render (nametags only). Fully guarded: this must
  // never throw inside the engine's render loop.
  function enforce() {
    for (const [p, v] of [...nameLive]) {
      try {
        if (!p?.parent) { nameLive.delete(p); continue; }
        styleElement(v.el, v.badge);
      } catch { nameLive.delete(p); }
    }
    if (!live.size) return;
    for (const e of [...live]) {
      try {
        const { node, target } = e;
        if (!node?.element || !node?.parent) { live.delete(e); continue; }
        if (node.element.texture !== e.tex || (target?.element && target.element.texture !== e.tex)) paint(node, target, e.tex);
        if (!node.enabled) node.enabled = true;
        if (CONFIG.REPLACE_BUILTIN) {
          for (const c of builtinChildren(e.container, e.prefix)) if (c.enabled) c.enabled = false;
        }
      } catch { live.delete(e); }
    }
  }

  // ---------------------------------------------------------------- nametags
  async function applyNametag(player) {
    const sc = player?.script?.enemy;
    const be = sc?.badgeEntity;
    if (!be) return;
    const a = state.assignments.get(norm(player.username));
    const nameEl = sc.usernameEntity?.element;

    // --- name colour
    if (a && nameEl && styleFor(a.badge)) {
      if (!player._mcbName) player._mcbName = { color: nameEl.color?.clone?.(), markup: nameEl.enableMarkup };
      nameLive.set(player, { el: nameEl, badge: a.badge });
      try { styleElement(nameEl, a.badge); } catch (e) { warn("Name colour failed:", e); }
    } else if (player._mcbName) {              // assignment removed: restore
      nameLive.delete(player);
      try {
        if (nameEl) {
          nameEl.text = stripMarkup(nameEl.text);
          if (player._mcbName.color) nameEl.color = player._mcbName.color;
          if ("enableMarkup" in nameEl) nameEl.enableMarkup = player._mcbName.markup;
        }
      } catch {}
      player._mcbName = null;
    }

    // --- badge icon
    if (!a) {
      if (player._mcbActive) {            // badge was removed: restore built-in state
        player._mcbActive = false;
        const custom = be.findByName(CUSTOM);
        if (custom) custom.enabled = false;
        const real = player.badge && player.badge !== "User" ? be.findByName(player.badge) : null;
        if (real) real.enabled = true;
        be.enabled = !!real;
      }
      return;
    }
    be.enabled = true;
    player._mcbActive = true;
    const ok = await setCustomBadge(be, a, undefined, { persist: true, mode: "nested" });
    if (ok && !player._mcbPivoted) {
      player._mcbPivoted = true;
      try { be.fire("Pivot"); } catch {}  // same event the game fires after enabling its own badge
    }
  }

  // -------------------------------------------------------------- tab list
  function applyTabSlots(manager) {
    const m = manager || findOverlay();
    const holder = m?.tabSlotHolder;
    if (!holder) return;
    for (const slot of [...(holder.children || [])]) {
      const name = slot.script?.button?.argument ?? slot.findByName?.("Profile")?.script?.button?.argument;
      if (!name) continue;                      // template row / header
      const group = slot.findByName?.("Badge");
      if (!group) continue;
      const a = state.assignments.get(norm(name));
      if (!a) continue;                         // rows are rebuilt each render; nothing to undo
      group.enabled = true;
      try { styleElement(slot.findByName?.("Username")?.element, a.badge); } catch (e) { warn("Tab name colour failed:", e); }
      setCustomBadge(group, a, undefined, { mode: "flat" });
    }
  }

  // -------------------------------------------------------------------- chat
  function onChatMessage(d) {
    try {
      if (!d || d.type !== 0) return;           // type 0 = normal player message
      const a = state.assignments.get(norm(d.username)); // norm() trims the game's 6-space pad
      if (!a) return;
      const list = findOverlay()?.chatMessageEntities;
      const row = list?.[list.length - 1];      // the game just pushed this message's entity
      if (!row?.element) return;

      // Ensure the name has a gap for the icon (game already adds it for staff)
      // and recolour the name for this badge.
      const style = styleFor(a.badge);
      const t = row.element.text || "";
      const re = /^(\[color=[^\]]*\])(\s*)([^\[]*?)(\[\/color\])/;
      row.element.text = re.test(t)
        ? t.replace(re, (m, tag, sp, name, close) => {
            const pad = sp.length >= 4 ? sp : CONFIG.CHAT_PAD;
            return style ? pad + colorize(name, style) : tag + pad + name + close;
          })
        : t;
      setCustomBadge(row, a, "Badge-", { mode: "flat", resetTint: true });
    } catch (e) { warn("Chat badge failed:", e); }
  }

  // -------------------------------------------------------------------- hooks
  function hook() {
    const app = getApp();
    const m = findOverlay();
    if (!app || !m) return;

    // renderTab lives on the script class prototype in the real game; walk the
    // chain so this also works if it's ever an own property.
    let owner = m;
    while (owner && !Object.prototype.hasOwnProperty.call(owner, "renderTab")) owner = Object.getPrototypeOf(owner);
    if (owner && !owner.__mcbWrapped) {
      const orig = owner.renderTab;
      if (typeof orig === "function") {
        owner.renderTab = function (...args) {
          const r = orig.apply(this, args);
          try { applyTabSlots(this); } catch (e) { warn("Tab badge failed:", e); }
          return r;
        };
        owner.__mcbWrapped = true;
        state.wrappedProto = owner;
        log("Hooked OverlayManager.renderTab.");
      }
    }
    if (state.enforceApp !== app) {
      try { app.on("prerender", enforce); } catch {}
      state.enforceApp = app;
    }
    if (state.chatApp !== app) {
      app.on("OverlayManager:ChatMessage", onChatMessage); // registered after the game's own handler
      state.chatApp = app;
      log("Hooked OverlayManager:ChatMessage.");
    }
  }

  function scanAll() {
    for (const p of getPlayers()) applyNametag(p);
    const m = findOverlay();
    if (m?.tabEntity?.enabled) applyTabSlots(m);
  }

  // ---------------------------------------------------------------- public API
  window.MeelandClientBadges = {
    reload: loadBadges,
    scan: scanAll,
    get: u => state.assignments.get(norm(u)) || null,
    list: () => Object.fromEntries(state.assignments),
    status: () => ({
      configured: configured(),
      assignments: state.assignments.size,
      lastError: state.lastError
    }),
    // MeelandClientBadges.inspect("name") -> what the nametag badge container holds.
    inspect: username => {
      const p = getPlayers().find(x => norm(x.username) === norm(username));
      const be = p?.script?.enemy?.badgeEntity;
      if (!be) return "no player / badgeEntity found";
      const info = n => ({
        name: n.name, enabled: n.enabled,
        elementType: n.element?.type ?? null,
        hasSprite: !!n.element?.sprite || !!n.element?.spriteAsset,
        textureName: n.element?.texture?.name ?? null,
        textureAsset: n.element?.textureAsset ?? null,
        children: (n.children || []).map(c => c.name)
      });
      return { badgeEntityEnabled: be.enabled, playerBadge: p.badge, children: (be.children || []).map(info) };
    },
    // MeelandClientBadges.inspectChat() -> dumps the newest chat row's badge nodes
    // (colour, opacity, sprite, size...) so a wrong-looking chat badge can be diagnosed.
    inspectChat: () => {
      const list = findOverlay()?.chatMessageEntities;
      const row = list?.[list.length - 1];
      if (!row) return "no chat rows yet - send a message first";
      const rows = [];
      (function walk(n, depth) {
        const el = n.element;
        const col = el?.color;
        rows.push({
          path: "  ".repeat(depth) + n.name,
          enabled: n.enabled,
          type: el?.type ?? null,
          color: col ? [col.r, col.g, col.b, col.a].map(v => +v.toFixed(2)).join(",") : null,
          opacity: el?.opacity ?? null,
          hasSprite: !!el?.sprite,
          texture: el?.texture?.name ?? null,
          size: el ? el.width + "x" + el.height : null
        });
        for (const c of n.children || []) walk(c, depth + 1);
      })(row, 0);
      return { text: String(row.element?.text || "").slice(0, 80), nodes: rows };
    },
    // Run MeelandClientBadges.debug() in the console if something doesn't show.
    debug: () => {
      const players = getPlayers();
      const m = findOverlay();
      return {
        app: !!getApp(),
        overlayManager: !!m,
        renderTabHooked: !!state.wrappedProto,
        chatHooked: !!state.chatApp,
        players: players.length,
        playersWithEnemyScript: players.filter(p => p?.script?.enemy?.badgeEntity).length,
        playerUsernames: players.map(p => p.username),
        assignmentKeys: [...state.assignments.keys()],
        tabSlots: m?.tabSlotHolder?.children?.length ?? null,
        chatRows: m?.chatMessageEntities?.length ?? null
      };
    }
  };

  function start() {
    if (state.started) return;
    state.started = true;
    let tries = 0;
    const wait = setInterval(() => {
      tries++;
      if (getApp() && window.GameGlobals) {
        clearInterval(wait);
        hook();
        loadBadges();
        setInterval(() => { hook(); scanAll(); }, CONFIG.SCAN_MS);
        setInterval(loadBadges, CONFIG.REFRESH_MS);
        log("Started.");
      } else if (tries > 240) {
        clearInterval(wait);
        warn("Game API not found; stopped waiting.");
      }
    }, 500);
  }
  (function raf() { try { enforce(); } catch {} requestAnimationFrame(raf); })(); // fallback if engine event name differs
  start();
})();