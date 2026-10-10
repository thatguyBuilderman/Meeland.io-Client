// ==UserScript==
// @name         Meeland Bot Bridge
// @namespace    meeland-bot
// @version      0.1
// @description  Connects the Meeland game client to a local Python bridge for autonomous play
// @match        https://meeland.io/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const BRIDGE_URL = "ws://localhost:8765";
  const STATE_PUSH_INTERVAL_MS = 250;
  const RECONNECT_DELAY_MS = 2000;

  // Map our logical key names to actual DOM KeyboardEvent codes.
  // PlayCanvas's keyboard handler listens on `document` (or app element)
  // for standard keydown/keyup, so synthesizing real events works without
  // touching PlayerController internals directly.
  const KEY_CODE_MAP = {
    w: "KeyW",
    a: "KeyA",
    s: "KeyS",
    d: "KeyD",
    space: "Space",
    shift: "ShiftLeft",
  };

  let socket = null;
  let stateTimer = null;
  const heldKeys = new Set();

  function log(...args) {
    console.log("[MeelandBot]", ...args);
  }

  function connect() {
    socket = new WebSocket(BRIDGE_URL);

    socket.onopen = () => {
      log("connected to bridge");
      send({ type: "hello", data: { ua: navigator.userAgent, ts: Date.now() } });
      if (stateTimer) clearInterval(stateTimer);
      stateTimer = setInterval(pushState, STATE_PUSH_INTERVAL_MS);
    };

    socket.onclose = () => {
      log("disconnected, retrying in", RECONNECT_DELAY_MS, "ms");
      if (stateTimer) clearInterval(stateTimer);
      releaseAllKeys();
      setTimeout(connect, RECONNECT_DELAY_MS);
    };

    socket.onerror = (err) => {
      log("socket error", err);
      socket.close();
    };

    socket.onmessage = (evt) => {
      let msg;
      try {
        msg = JSON.parse(evt.data);
      } catch (e) {
        return;
      }
      handleMessage(msg);
    };
  }

  function send(obj) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(obj));
    }
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case "key":
        setKey(msg.key, msg.action);
        send({ type: "ack", id: msg.id });
        break;
      case "screenshot_request":
        captureScreenshot(msg.id);
        break;
      default:
        log("unhandled message", msg);
    }
  }

  // ---- Input simulation ----
  // Dispatch real KeyboardEvents so the game's own input layer (whatever
  // it's listening on: document, canvas, or the PlayCanvas app element)
  // picks them up exactly like a real key press would.

  // Some engines (older PlayCanvas builds included) still branch on the
  // legacy numeric keyCode/which fields instead of code/key. The
  // KeyboardEvent constructor makes those read-only and always 0, so we
  // override them via defineProperty. Confirmed necessary for this game
  // via manual console testing (keydown had no effect until this was added).
  const KEY_CODE_NUM = {
    KeyW: 87,
    KeyA: 65,
    KeyS: 83,
    KeyD: 68,
    Space: 32,
    ShiftLeft: 16,
  };

  function dispatchKeyEvent(code, type) {
    const evt = new KeyboardEvent(type, {
      code,
      key: codeToKey(code),
      bubbles: true,
      cancelable: true,
    });
    const keyCodeNum = KEY_CODE_NUM[code] || 0;
    Object.defineProperty(evt, "keyCode", { get: () => keyCodeNum });
    Object.defineProperty(evt, "which", { get: () => keyCodeNum });

    // Fire on every plausible target: some engines listen on window,
    // some on document, some on the focused element specifically.
    const active = document.activeElement;
    if (active && active !== document.body) active.dispatchEvent(evt);
    document.dispatchEvent(evt);
    window.dispatchEvent(evt);
  }

  function codeToKey(code) {
    const map = { KeyW: "w", KeyA: "a", KeyS: "s", KeyD: "d", Space: " ", ShiftLeft: "Shift" };
    return map[code] || code;
  }

  function setKey(logicalKey, action) {
    const code = KEY_CODE_MAP[logicalKey];
    if (!code) {
      log("unknown key", logicalKey);
      return;
    }
    if (action === "down") {
      if (!heldKeys.has(code)) {
        heldKeys.add(code);
        dispatchKeyEvent(code, "keydown");
      }
    } else if (action === "up") {
      if (heldKeys.has(code)) {
        heldKeys.delete(code);
        dispatchKeyEvent(code, "keyup");
      }
    }
  }

  function releaseAllKeys() {
    for (const code of Array.from(heldKeys)) {
      heldKeys.delete(code);
      dispatchKeyEvent(code, "keyup");
    }
  }

  // ---- State reading ----
  // Reads whatever GameGlobals exposes. Defensive about missing fields
  // since PlayCanvas entities may not all be ready yet.

  function readPlayerState() {
    const g = window.GameGlobals;
    if (!g || !g.playerEntity) return null;

    const p = g.playerEntity;
    const pos = p.getPosition ? p.getPosition() : p.position || null;
    const rot = p.getEulerAngles ? p.getEulerAngles() : null;

    return {
      position: pos ? { x: pos.x, y: pos.y, z: pos.z } : null,
      rotation: rot ? { x: rot.x, y: rot.y, z: rot.z } : null,
      gameMode: g.gameMode || null,
    };
  }

  function pushState() {
    const playerState = readPlayerState();
    send({
      type: "state",
      data: {
        player: playerState,
        ts: Date.now(),
        connected: !!(window.GameGlobals && window.GameGlobals.playerEntity),
      },
    });
  }

  // ---- Screenshot ----
  // WebGL clears its drawing buffer by default right before the next
  // frame renders (unless preserveDrawingBuffer was set at context
  // creation, which we don't control). Capturing "whenever the request
  // arrives" often lands after that clear -> black image.
  // PlayCanvas fires 'postrender' right after each frame draws and before
  // the next frame's clear, so we hook that instead of capturing blind.

  function getPcApp() {
    const g = window.GameGlobals;
    if (g && g.playerEntity && g.playerEntity.app) return g.playerEntity.app;
    if (window.pc && window.pc.Application && window.pc.Application.getApplication) {
      return window.pc.Application.getApplication();
    }
    return null;
  }

  function captureScreenshot(id) {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      send({ type: "screenshot", id, data: null });
      return;
    }

    function grab() {
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        const base64 = dataUrl.split(",")[1];
        send({ type: "screenshot", id, data: base64 });
      } catch (e) {
        log("screenshot failed", e);
        send({ type: "screenshot", id, data: null });
      }
    }

    const app = getPcApp();
    if (app && typeof app.once === "function") {
      app.once("postrender", grab);
    } else {
      // Fallback if we can't find the app instance: capture immediately.
      // May come back black on a WebGL canvas without preserveDrawingBuffer.
      log("no pc.Application found, capturing without postrender hook");
      grab();
    }
  }

  // ---- Boot ----
  window.addEventListener("beforeunload", releaseAllKeys);
  connect();
  log("bridge script loaded");
})();