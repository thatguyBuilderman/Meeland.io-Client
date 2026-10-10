(function () {
    'use strict';

    function injectStyles() {
        if (!document.getElementById('ml-custom-styles')) {
            const style = document.createElement('style');
            style.id = 'ml-custom-styles';
            style.textContent = `

                @font-face {
                    font-family: 'Lilita One';
                    src: url(${JSON.stringify(window.__MEELAND_FONT_DATA__ || '')}) format('truetype');
                    font-weight: 400;
                    font-style: normal;
                    font-display: swap;
                }

                #ml-dashboard {
                    transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                                height 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                                transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                                opacity 0.22s ease;
                }

                #ml-dash-backdrop {
                    transition: opacity 0.22s ease;
                }

                .ml-fade-in {
                    animation: mlFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .ml-fade-out {
                    animation: mlFadeOut 0.12s ease-in forwards;
                }

                @keyframes mlFadeIn {
                    from { opacity: 0; transform: scale(0.97) translateY(3px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }

                @keyframes mlFadeOut {
                    from { opacity: 1; transform: scale(1) translateY(0); }
                    to { opacity: 0; transform: scale(0.97) translateY(-3px); }
                }

                @keyframes mlPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(25,199,199,0.5); }
                    50% { box-shadow: 0 0 0 6px rgba(25,199,199,0); }
                }

                #ml-dashboard, #ml-dashboard * {
                    letter-spacing: 0.6px;
                    text-rendering: optimizeLegibility;
                    -webkit-font-smoothing: antialiased;
                }

                #ml-keyboard, #ml-keyboard * {
                    text-rendering: optimizeLegibility;
                    -webkit-font-smoothing: antialiased;
                }

                .ml-no-scrollbar::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                .ml-no-scrollbar {
                    -ms-overflow-style: none !important;
                    scrollbar-width: none !important;
                }

                @keyframes mlNudgeRight {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(3px); }
                }

                #ml-tab-nav-hint {
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    width: 108px;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    background: linear-gradient(to right, rgba(13,13,13,0) 0%, #0D0D0D 55%);
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }
                #ml-tab-nav-hint .ml-scroll-pill {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 5px 9px 5px 11px;
                    border-radius: 999px;
                    background: #171717;
                    border: 1px solid #19C7C7;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.5);
                }
                #ml-tab-nav-hint .ml-scroll-pill span {
                    color: #FFFFFF;
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: 0.8px;
                    white-space: nowrap;
                }
                #ml-tab-nav-hint .ml-scroll-pill svg {
                    animation: mlNudgeRight 1.1s ease-in-out infinite;
                    transform-origin: center;
                }

                .ml-red-scroll::-webkit-scrollbar {
                    width: 5px;
                }
                .ml-red-scroll::-webkit-scrollbar-track {
                    background: #0D0D0D;
                }
                .ml-red-scroll::-webkit-scrollbar-thumb {
                    background: #242424;
                    border-radius: 3px;
                }
                .ml-red-scroll::-webkit-scrollbar-thumb:hover {
                    background: #19C7C7;
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }
    }
    try { injectStyles(); } catch (_) {}
    const STORAGE_KEY = '_meeland_client_v4';
    const ROOM_STORAGE_KEY = 'meeland_room_history';

    const ICONS = {
        camera: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
        history: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        keyboard: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>',
        settings: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        hotkey: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="12" r="4"/><path d="M11 12h10"/><path d="M17 12v4"/><path d="M21 12v3"/></svg>',
        activity: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
        chevronRight: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#19C7C7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>',
        originalLogo: `<svg width="76" height="76" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="mlChromeEdge" x1="20%" y1="20%" x2="80%" y2="80%">
                    <stop offset="0%" stop-color="#ffffff"/>
                    <stop offset="35%" stop-color="#e5e7eb"/>
                    <stop offset="70%" stop-color="#9ca3af"/>
                    <stop offset="100%" stop-color="#4b5563"/>
                </linearGradient>
            </defs>
            <rect x="5" y="5" width="90" height="90" rx="16" fill="#111111" stroke="#19C7C7" stroke-width="1.5"/>
            <path d="M36 26 L76 50 L36 74 Z" fill="none" stroke="url(#mlChromeEdge)" stroke-width="11.5" stroke-linejoin="round" stroke-linecap="round"/>
            <path d="M41 38 L62 50 L41 62 Z" fill="#090909" opacity="0.6"/>
        </svg>`
    };

    const GAME_NAMES = {
        Hub: 'Meeland Hub',
        PetTycoon: 'Steal a Pet',
        EscapeTsunami: 'Escape Waves',
        TowerParkour: 'Obby Tower',
        Infection: 'Murder Mystery',
        SwordRNG: 'Pets RNG',
        SwordRng: 'Pets RNG',
        'Sword RNG': 'Pets RNG'
    };

    let cfg = {
        camera: {
            fov: 75,
            firstPerson: false,
            firstPersonFov: 90,
            fovVerticalMult: 1.4,
            hideBodyInFpv: true,
            eyeOffset: -0.35,
            skySwapEnabled: true
        },
        keyboard: { enabled: true, opacity: 0.95 },
        hud: { showFloatingToggle: true },
        webhook: {
            enabled: false,
            url: '',
            minRarity: 1000000,
            pingEveryone: true
        },
        hotkeys: {
            dashboard: 'F9',
            autoJoin: 'F2',
            roomHistory: 'F3',
            reload: 'F6',
            fpvToggle: 'Period'
        }
    };
    const DEFAULT_HOTKEYS = { ...cfg.hotkeys };

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) || {};
            // Deep-merge each known nested section instead of a shallow
            // Object.assign. A shallow merge replaces cfg.camera wholesale
            // with the saved copy, so any field added to the defaults
            // after a user's config was last saved (e.g. skySwapEnabled)
            // simply disappears — it's not false, it's undefined, which
            // getEffectiveSky() treats as "off" with no way to tell.
            cfg = {
                ...cfg,
                ...parsed,
                camera: { ...cfg.camera, ...(parsed.camera || {}) },
                keyboard: { ...cfg.keyboard, ...(parsed.keyboard || {}) },
                hud: { ...cfg.hud, ...(parsed.hud || {}) },
                webhook: { ...cfg.webhook, ...(parsed.webhook || {}) },
                hotkeys: { ...cfg.hotkeys, ...(parsed.hotkeys || {}) }
            };
        }
    } catch (_) {}

    function saveCfg() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (_) {}
    }

    function unlockMouse() {
        try {
            if (document.exitPointerLock) document.exitPointerLock();
            if (document.mozExitPointerLock) document.mozExitPointerLock();
            if (document.webkitExitPointerLock) document.webkitExitPointerLock();
        } catch (_) {}
    }

    const getWin = () => (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const getApp = () => {
        try {
            const w = getWin();
            return (w.pc && w.pc.app) || (w.pc?.Application?.getApplication && w.pc.Application.getApplication()) || (window.pc && window.pc.app) || null;
        } catch (_) { return null; }
    };
    const getPlayer = () => {
        try {
            const app = getApp(), w = getWin();
            return app?.root?.findByName('Player') || (w.GameGlobals && w.GameGlobals.playerEntity) || null;
        } catch (_) { return null; }
    };

    function getFriendlyGameName(mode) {
        if (!mode) return 'Meeland Hub';
        return GAME_NAMES[String(mode)] || String(mode);
    }

    // ====================================================
    // GATEWAY LOGO
    //
    // Uses meeland.png from the .ms folder if it's present,
    // otherwise falls back to the built-in SVG icon.
    // ====================================================
    const LOGO_ASSET_FILENAME = 'LaunchLogo.png';

    function getGatewayLogoMarkup() {
        const local = (typeof window !== 'undefined' && window.__MEELAND_ASSETS__ && window.__MEELAND_ASSETS__[LOGO_ASSET_FILENAME]) || null;
        if (local) {
            return '<img src="' + local + '" alt="Meeland" style="width:76px;height:76px;object-fit:contain;border-radius:16px;filter:drop-shadow(0 4px 14px rgba(0,0,0,0.5));" />';
        }
        return ICONS.originalLogo;
    }

    // ====================================================
    // LAUNCH SPLASH SCREEN
    //
    // Shown once when the client boots up, before anything
    // else — a full-screen "here's what changed" screen with
    // a Launch button to dismiss it.
    //
    // TO PUBLISH A NEW UPDATE: just edit the two fields below
    // (bump version, replace the changelog lines) and save.
    // Nothing else in this file needs to change.
    //
    // Background is an infinite animated field of the Meeland logo:
    // small copies drift in from the distance, grow larger as they fly
    // toward the viewer, rotate, then fade out and are quietly replaced
    // farther away — endlessly, with no visible loop point. Uses
    // meeland.png (same asset pipeline as the gateway logo above) if
    // it's present in the .ms folder, otherwise falls back to the
    // built-in SVG icon. The canvas is never scaled as a whole — only
    // the individual logo image is drawn at a computed size each frame
    // — so it always stays as sharp as the source asset allows.
    // ====================================================
    const LAUNCH_SPLASH = {
        version: 'v1.1.1',
        changelog: [
            'Fixed menu',
            'Removed glitched Settings Category',
            'New launch screen',
            'Fixed Discord activity'
        ]
    };

    function getLaunchSplashLogoSrc() {
        const local = (typeof window !== 'undefined' && window.__MEELAND_ASSETS__ && window.__MEELAND_ASSETS__[LOGO_ASSET_FILENAME]) || null;
        if (local) return local;
        try {
            return 'data:image/svg+xml;base64,' + btoa(ICONS.originalLogo);
        } catch (_) {
            return null;
        }
    }

    const ML_TWO_PI = Math.PI * 2;
    function mlClamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function mlRandRange(min, max) { return min + Math.random() * (max - min); }

    // One independent "flying logo field" instance, fully self-contained
    // so a fresh one can be created per splash-open and torn down
    // cleanly on close (no leaked rAF loops or resize listeners).
    function createLogoField(layer) {
    const opts = {
        count: 22,
        baseSize: 70,            // reference display width (css px) at scale = 1
        minScale: 0.6,           // far/spawn display width = baseSize * minScale (~42px)
        maxScale: 7,             // near/despawn display width = baseSize * maxScale (~490px) — big swing = real "coming at you" punch
        speedMin: 0.4,
        speedMax: 0.85,
        nearBoost: 2.2,          // extra acceleration multiplier as a logo gets close, on top of natural perspective growth
        streakStrength: 0.4,     // 0 = no motion-stretch, higher = more elongation when close/fast
        spinMin: 0.12,
        spinMax: 0.55,
        wobbleAmp: 0.08,
        wobbleSpeedMin: 0.15,
        wobbleSpeedMax: 0.4,
        radiusMinFrac: 0.05,
        radiusMaxFrac: 0.92,
        maxOpacity: 0.85,
        fadeInFraction: 0.16,
        fadeOutFraction: 0.1,
        bankAmp: 0.03,
        bankSpeed: 0.06,
        spawnWindow: 4.5
    };

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
    layer.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: false });

    let width = 0, height = 0;
    let img = null;
    let imgAspect = 1;
    let particles = [];
    let rafId = null;
    let running = false;
    let lastT = 0;
    let time = 0;
    let destroyed = false;

    const zNear = () => 1 / opts.maxScale;
    const zFar = () => 1 / opts.minScale;

    function resize() {
        width = layer.clientWidth || window.innerWidth * 1.1;
        height = layer.clientHeight || window.innerHeight * 1.1;
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    }

    function respawn(p) {
        p.baseTheta = p.laneCenter + mlRandRange(-p.laneWidth * 0.35, p.laneWidth * 0.35);
        p.radius = mlRandRange(width * opts.radiusMinFrac, width * opts.radiusMaxFrac);
        p.speed = mlRandRange(opts.speedMin, opts.speedMax);
        p.rotation = Math.random() * ML_TWO_PI;
        p.spin = (Math.random() < 0.5 ? -1 : 1) * mlRandRange(opts.spinMin, opts.spinMax);
        p.wobblePhase = Math.random() * ML_TWO_PI;
        p.wobbleSpeed = mlRandRange(opts.wobbleSpeedMin, opts.wobbleSpeedMax);
        p.z = zFar();
    }

    function buildParticles() {
        const laneWidth = ML_TWO_PI / opts.count;
        particles = [];
        for (let i = 0; i < opts.count; i++) {
            const p = { laneCenter: i * laneWidth + laneWidth / 2, laneWidth, active: false };
            p.entryDelay = (i / opts.count) * opts.spawnWindow + mlRandRange(0, opts.spawnWindow / opts.count);
            respawn(p);
            particles.push(p);
        }
    }

    function alphaFor(p) {
        const zn = zNear(), zf = zFar();
        const range = zf - zn;
        const fadeInEnd = zf - range * opts.fadeInFraction;
        const fadeOutStart = zn + range * opts.fadeOutFraction;
        let a = 1;
        if (p.z > fadeInEnd) a = mlClamp01((zf - p.z) / (zf - fadeInEnd));
        else if (p.z < fadeOutStart) a = mlClamp01((p.z - zn) / (fadeOutStart - zn));
        return a * opts.maxOpacity;
    }

    function update(dt) {
        const zn = zNear(), zf = zFar();
        for (const p of particles) {
            if (!p.active) {
                if (time < p.entryDelay) continue;
                p.active = true;
            }
            // How close this particle is to the viewer, 0 (just spawned) -> 1 (about to vanish).
            // Feeding this back into its own speed makes the final stretch of the
            // approach accelerate hard, instead of growing at a flat constant rate.
            const closeness = mlClamp01((zf - p.z) / (zf - zn));
            const effectiveSpeed = p.speed * (1 + opts.nearBoost * closeness * closeness);
            p.z -= effectiveSpeed * dt;
            if (p.z <= zn) respawn(p);
            p.rotation += p.spin * dt;
        }
    }

    function render(t) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        if (!img) return;

        const cx = width / 2, cy = height / 2;
        const aspectY = height / width;
        const bank = Math.sin(t * opts.bankSpeed) * opts.bankAmp;
        const cosB = Math.cos(bank), sinB = Math.sin(bank);
        const ordered = particles.filter(p => p.active).sort((a, b) => b.z - a.z);

        for (const p of ordered) {
            const scale = 1 / p.z;
            const theta = p.baseTheta + Math.sin(t * p.wobbleSpeed + p.wobblePhase) * p.laneWidth * opts.wobbleAmp;
            const wx = Math.cos(theta) * p.radius;
            const wy = Math.sin(theta) * p.radius * aspectY;
            const sx = wx * scale, sy = wy * scale;
            const screenX = cx + (sx * cosB - sy * sinB);
            const screenY = cy + (sx * sinB + sy * cosB);

            const alpha = alphaFor(p);
            if (alpha <= 0.003) continue;

            const dw = opts.baseSize * scale;
            const dh = dw * imgAspect;

            // Direction from the vanishing point out to this logo — the axis
            // it's effectively "flying along" as it approaches the viewer.
            const moveAngle = Math.atan2(screenY - cy, screenX - cx);
            const stretch = mlClamp01((scale - 1) / (opts.maxScale - 1)) * opts.streakStrength;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(screenX, screenY);
            ctx.rotate(moveAngle);
            ctx.scale(1 + stretch, 1); // elongate along the direction of travel
            ctx.rotate(-moveAngle);
            ctx.rotate(p.rotation + bank);
            ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
            ctx.restore();
        }
    }

    function loop(now) {
        if (!running) return;
        let dt = (now - lastT) / 1000;
        lastT = now;
        if (dt > 0.05) dt = 0.05;
        time += dt;
        update(dt);
        render(time);
        rafId = requestAnimationFrame(loop);
    }

    function onWindowResize() { if (!destroyed) resize(); }

    resize();
    buildParticles();
    render(0);

    const srcUrl = getLaunchSplashLogoSrc();
    if (srcUrl) {
        const image = new Image();
        image.onload = () => {
            if (destroyed) return;
            imgAspect = (image.naturalHeight || image.height || 1) / (image.naturalWidth || image.width || 1);
            img = image;
        };
        image.src = srcUrl;
    }

    window.addEventListener('resize', onWindowResize);

    return {
        start() {
            if (running || destroyed) return;
            running = true;
            lastT = performance.now();
            rafId = requestAnimationFrame(loop);
        },
        stop() {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
        },
        destroy() {
            destroyed = true;
            this.stop();
            window.removeEventListener('resize', onWindowResize);
            try { canvas.remove(); } catch (_) {}
            particles = [];
            img = null;
        }
    };
}

    let splashModal = null;
    let splashBgLayer = null;
    let splashLogoField = null;
    let splashShown = false;
    let splashDismissed = false;

    function hideLaunchSplash() {
        if (!splashModal) return;
        splashDismissed = true;
        if (splashLogoField) { try { splashLogoField.destroy(); } catch (_) {} splashLogoField = null; }
        const ref = splashModal;
        ref.style.opacity = '0';
        setTimeout(() => { try { ref.remove(); } catch (_) {} }, 260);
        splashModal = null;
        splashBgLayer = null;
        try { createFloatingBtn(); } catch (_) {}
    }

    function showLaunchSplash() {
        if (splashShown) return;
        splashShown = true;

        const targetParent = document.body || document.documentElement;
        if (!targetParent) { splashShown = false; return; }

        splashModal = document.createElement('div');
        splashModal.id = 'ml-launch-splash';
        splashModal.style.cssText = 'position:fixed;inset:0;z-index:2147483647;opacity:0;transition:opacity 0.3s ease;overflow:hidden;background:#050505;color:#FFFFFF;font-family:\'Lilita One\',system-ui,-apple-system,sans-serif;user-select:none;pointer-events:auto;cursor:default;';
        ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'contextmenu', 'wheel'].forEach(evt => {
            splashModal.addEventListener(evt, (e) => e.stopPropagation(), { passive: evt === 'wheel' });
        });

        // Background layer — the animated logo field canvas lives in here.
        splashBgLayer = document.createElement('div');
        splashBgLayer.style.cssText = 'position:absolute;top:-5%;left:-5%;width:110%;height:110%;overflow:hidden;background:#000000;';
        splashModal.appendChild(splashBgLayer);

        // Dark gradient so the text stays readable over the animation.
        const shade = document.createElement('div');
        shade.style.cssText = 'position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 26%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.7) 100%);pointer-events:none;';
        splashModal.appendChild(shade);


        const changelogItems = LAUNCH_SPLASH.changelog.map(line =>
            '<li style="margin-bottom:5px;">' + line + '</li>'
        ).join('');

        const content = document.createElement('div');
        content.className = 'ml-content-wrapper ml-fade-in';
        content.style.cssText = 'position:relative;width:100%;height:100%;box-sizing:border-box;';
        content.innerHTML = `
            <button id="ml-splash-close" style="position:absolute;top:24px;left:24px;background:rgba(17,17,17,0.75);border:1px solid #242424;color:#999999;border-radius:6px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:bold;font-size:12px;transition:all 0.15s ease;" onmouseover="this.style.background='#171717';this.style.color='#FFFFFF'" onmouseout="this.style.background='rgba(17,17,17,0.75)';this.style.color='#999999'">&#10005;</button>

            <div style="position:absolute;top:28px;right:32px;text-align:right;max-width:340px;text-shadow:0 2px 10px rgba(0,0,0,0.7);">
                <div style="font-size:16px;letter-spacing:1.5px;font-weight:400;white-space:nowrap;">MEELAND <span style="color:#19C7C7;">CLIENT</span></div>
                <div style="font-size:11px;color:#aaaaaa;font-weight:700;letter-spacing:0.6px;margin-top:2px;margin-bottom:10px;">${LAUNCH_SPLASH.version}</div>
                <div style="font-size:11px;color:#19C7C7;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:5px;">Changelog</div>
                <ul style="margin:0;padding:0;list-style:none;font-size:12px;color:#e0e0e0;line-height:1.55;">
                    ${changelogItems}
                </ul>
            </div>

            <button id="ml-splash-launch" style="position:absolute;right:32px;bottom:32px;padding:13px 32px;background:#19C7C7;border:1px solid #19C7C7;color:#000000;border-radius:8px;font-weight:800;font-size:14px;letter-spacing:1.5px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.4);transition:all 0.18s ease;" onmouseover="this.style.transform='translateY(-1px)';this.style.background='#22D6D6';" onmouseout="this.style.transform='none';this.style.background='#19C7C7';">LAUNCH</button>
        `;
        splashModal.appendChild(content);

        splashModal.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target.closest('#ml-splash-close') || e.target.closest('#ml-splash-launch')) {
                hideLaunchSplash();
            }
        });

        targetParent.appendChild(splashModal);

        try {
            splashLogoField = createLogoField(splashBgLayer);
            splashLogoField.start();
        } catch (_) {}

        requestAnimationFrame(() => {
            if (!splashModal) return;
            splashModal.style.opacity = '1';
        });
    }

    // ====================================================
    // 2. SKYSWAP ENGINE
    // ====================================================
    const TARGET_SKY_MARKER = '290757709/1/Sky_Toon17Optimized.webp';

    function isTargetSkyUrl(url) {
        try {
            return typeof url === 'string' && url.indexOf(TARGET_SKY_MARKER) !== -1;
        } catch (_) { return false; }
    }

    const SKY_ASSET_FILENAME = 'Midnight.png';

    function getEffectiveSky() {
        if (!cfg.camera?.skySwapEnabled) return null;
        const local = (typeof window !== 'undefined' && window.__MEELAND_ASSETS__ && window.__MEELAND_ASSETS__[SKY_ASSET_FILENAME]) || null;
        if (!local) {
            console.error('[Meeland SkySwap] Midnight.png is missing — sky swap disabled until it is restored.');
        }
        return local;
    }

    // Toggling cfg.camera.skySwapEnabled only changes *future* network
    // requests for the sky texture. If the sky was already fetched and
    // cached by the engine before the toggle was flipped, nothing visibly
    // changes until the scene reloads it — which looks like "the toggle
    // doesn't work". refreshSkyLive() finds the already-loaded sky asset
    // in PlayCanvas's asset registry and forces it to unload + reload, so
    // it goes back through our fetch/XHR/Image.src overrides immediately.
    function findSkyAssets(app) {
        try {
            if (!app?.assets?.list) return [];
            return app.assets.list().filter(a => isTargetSkyUrl(a?.file?.url));
        } catch (_) { return []; }
    }

    function refreshSkyLive() {
        try {
            const app = getApp();
            if (!app) return false;
            const assets = findSkyAssets(app);
            if (!assets.length) return false;
            assets.forEach(asset => {
                try {
                    asset.off('load');
                    asset.once('load', () => console.log('[Meeland SkySwap] Sky texture reloaded (' + (cfg.camera.skySwapEnabled ? 'custom' : 'default') + ').'));
                    asset.unload();
                    app.assets.load(asset);
                } catch (err) {
                    console.warn('[Meeland SkySwap] Failed to force-reload sky asset:', err);
                }
            });
            return true;
        } catch (_) { return false; }
    }

    const originalFetch = window.fetch ? window.fetch.bind(window) : null;
    if (originalFetch) {
        window.fetch = function (input, init) {
            try {
                const url = typeof input === 'string' ? input : (input && input.url);
                const sky = getEffectiveSky();
                if (sky && isTargetSkyUrl(url)) {
                    return originalFetch(sky, init);
                }
            } catch (_) {}
            return originalFetch(input, init);
        };
    }

    if (window.XMLHttpRequest) {
        const originalXhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            try {
                const sky = getEffectiveSky();
                if (sky && isTargetSkyUrl(url)) {
                    return originalXhrOpen.call(this, method, sky, ...rest);
                }
            } catch (_) {}
            return originalXhrOpen.call(this, method, url, ...rest);
        };
    }

    const originalImageSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (originalImageSrcDescriptor && originalImageSrcDescriptor.set) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
            get() { return originalImageSrcDescriptor.get.call(this); },
            set(value) {
                const sky = getEffectiveSky();
                if (sky && isTargetSkyUrl(value)) {
                    return originalImageSrcDescriptor.set.call(this, sky);
                }
                return originalImageSrcDescriptor.set.call(this, value);
            },
            configurable: true
        });
    }

    // ====================================================
    // 3. BACKGROUND ENGINE (Silent LoadingScreen Hook)
    // ====================================================
    let bgOverlay = null;
    let bgOverlayImage = null;
    let bgOverlayLabel = null;
    let lastKnownMode = 'Hub';
    let modeWaitTimer = null;

    function getGameMode() {
        try {
            const w = getWin();
            if (w.GameGlobals?.gameMode) return String(w.GameGlobals.gameMode).trim();
            if (window.GameGlobals?.gameMode) return String(window.GameGlobals.gameMode).trim();

            const app = getApp();
            const network = app?.root?.findByName('NetworkManager');
            if (network?.script?.networkManager?.gameMode) {
                return String(network.script.networkManager.gameMode).trim();
            }
        } catch (_) {}
        return 'Hub';
    }

    const BACKGROUND_ASSET_FILENAME = 'BackgroundFirst.png';

    function getBackgroundImageSrc() {
        const local = (typeof window !== 'undefined' && window.__MEELAND_ASSETS__ && window.__MEELAND_ASSETS__[BACKGROUND_ASSET_FILENAME]) || '';
        if (!local) {
            console.error('[Meeland Background] BackgroundFirst.png is missing — loading overlay disabled until it is restored.');
        }
        return local;
    }

    function createBgOverlay() {
        if (bgOverlay) return;
        const targetParent = document.body || document.documentElement;
        if (!targetParent) return;

        bgOverlay = document.createElement('div');
        bgOverlay.id = 'meeland-background-overlay';
        bgOverlay.style.cssText = 'position:fixed;inset:0;z-index:999999;display:none;background:#050203;user-select:none;pointer-events:none;transition:opacity 0.3s ease;';

        const bgImgSrc = getBackgroundImageSrc();

        bgOverlayImage = document.createElement('img');
        bgOverlayImage.id = 'meeland-background-image';
        bgOverlayImage.src = bgImgSrc;
        bgOverlayImage.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center center;margin:0;padding:0;';
        bgOverlay.appendChild(bgOverlayImage);

        bgOverlayLabel = document.createElement('div');
        bgOverlayLabel.id = 'meeland-background-label';
        bgOverlayLabel.style.cssText = 'position:absolute;left:0;right:0;bottom:0;padding:24px 20px 28px;text-align:center;font-family:\'Lilita One\',system-ui,-apple-system,sans-serif;font-size:clamp(22px,4vw,34px);font-weight:400;color:#fff;background:linear-gradient(transparent,rgba(15,2,5,0.7) 40%,rgba(15,2,5,0.92));backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);';
        bgOverlayLabel.textContent = 'Loading...';
        bgOverlay.appendChild(bgOverlayLabel);

        targetParent.appendChild(bgOverlay);
    }

    function hookLoadingScreen() {
        try {
            const w = getWin();
            const app = w.pc?.app;
            if (!app?.root) return false;

            const menu = app.root.findByName('GamePlayMenu');
            const overlayEntity = menu && menu.parent;
            if (!overlayEntity) return false;

            const loadingEntity = overlayEntity.findByName('LoadingScreen');
            if (!loadingEntity) return false;

            createBgOverlay();

            const originalDescriptor = Object.getOwnPropertyDescriptor(w.pc.GraphNode.prototype, 'enabled');
            if (!originalDescriptor?.set) return false;

            Object.defineProperty(loadingEntity, 'enabled', {
                get() { return originalDescriptor.get.call(this); },
                set(isEnteringLoad) {
                    originalDescriptor.set.call(this, isEnteringLoad);

                    if (isEnteringLoad) {
                        const bgImgSrc = getBackgroundImageSrc();
                        if (bgOverlayImage) bgOverlayImage.src = bgImgSrc;

                        if (bgOverlay) {
                            bgOverlay.style.display = 'block';
                            bgOverlay.style.opacity = '1';
                        }

                        if (modeWaitTimer) clearInterval(modeWaitTimer);
                        const startedAt = Date.now();

                        modeWaitTimer = setInterval(() => {
                            const mode = getGameMode();
                            const timedOut = Date.now() - startedAt > 5000;
                            if (mode !== lastKnownMode || timedOut) {
                                clearInterval(modeWaitTimer);
                                modeWaitTimer = null;
                                lastKnownMode = mode;
                                if (bgOverlayLabel) bgOverlayLabel.textContent = 'Loading ' + getFriendlyGameName(mode);
                            }
                        }, 100);
                    } else {
                        if (modeWaitTimer) {
                            clearInterval(modeWaitTimer);
                            modeWaitTimer = null;
                        }
                        lastKnownMode = getGameMode();
                        if (bgOverlay) {
                            bgOverlay.style.opacity = '0';
                            setTimeout(() => {
                                if (bgOverlay && bgOverlay.style.opacity === '0') {
                                    bgOverlay.style.display = 'none';
                                }
                            }, 300);
                        }
                    }
                },
                configurable: true
            });

            return true;
        } catch (_) { return false; }
    }

    // ====================================================
    // 4. CAMERA FOV & FIRST PERSON ENGINE
    // ====================================================
    let cameraHooked = false;

    function updateFpvBodyVisibility(isFpv) {
        if (!cfg.camera?.hideBodyInFpv) return;
        try {
            const player = getPlayer();
            const ch = player?.findByName('CharacterHolder');
            if (!ch || !ch.forEach) return;
            const petHolder = player.findByName('PetHolder');
            ch.forEach(child => {
                if (petHolder && (child === petHolder || petHolder.children?.includes(child))) return;
                if (!(child.render || child.model)) return;
                const name = (child.name || '').toLowerCase();
                if (/shoe|boot|weapon|sword|blade|tool/i.test(name)) return;
                child.enabled = !isFpv;
            });
        } catch (_) {}
    }

    function hookCamera() {
        if (cameraHooked) return;
        try {
            const app = getApp(), w = getWin();
            const cam = (w.GameGlobals && w.GameGlobals.cameraEntity) || app?.root?.findByName('Camera');
            if (!cam?.script?.cameraController?.postUpdate) return;

            const controller = cam.script.cameraController;
            const originalPostUpdate = controller.postUpdate;

            controller.postUpdate = function (dt) {
                originalPostUpdate.call(this, dt);

                const isFpv = !!cfg.camera?.firstPerson;
                updateFpvBodyVisibility(isFpv);

                const targetFov = Math.min(120, Math.max(50, isFpv ? (cfg.camera?.firstPersonFov || 90) : (cfg.camera?.fov || 75)));
                const vertMult = (window.innerHeight > window.innerWidth) ? (cfg.camera?.fovVerticalMult || 1.4) : 1;
                if (this.entity?.camera) this.entity.camera.fov = targetFov * vertMult;

                if (!isFpv) return;

                const origin = this.cameraOriginEntity;
                const mover = this.cameraMoverEntity;
                if (origin && mover) {
                    const pos = origin.getPosition();
                    mover.setPosition(pos.x, pos.y + (cfg.camera?.eyeOffset || -0.35), pos.z);
                    mover.setRotation(origin.getRotation());
                }

                const player = getPlayer();
                if (player?.script?.playerController?.characterOriginEntity) {
                    player.script.playerController.characterOriginEntity.setLocalEulerAngles(0, this.eulers.x, 0);
                }
            };
            cameraHooked = true;
        } catch (_) {}
    }

    // ====================================================
    // 5. ROOM HISTORY ENGINE & STORAGE
    // ====================================================
    function loadRoomHistory() {
        try {
            const data = localStorage.getItem(ROOM_STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (_) { return []; }
    }

    function saveRoomHistory(list) {
        try { localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
    }

    let roomHistory = loadRoomHistory();
    let lastRecordedRoomId = null;

    function addRoomToHistory(roomId, roomName, gameMode) {
        if (!roomId) return;
        roomId = String(roomId);
        roomName = roomName ? String(roomName) : '';
        gameMode = gameMode ? String(gameMode) : 'Hub';

        const existingIdx = roomHistory.findIndex(r => r && String(r.roomId) === roomId);
        if (existingIdx !== -1) roomHistory.splice(existingIdx, 1);

        roomHistory.unshift({ roomId, roomName, gameMode, time: Date.now() });
        roomHistory = roomHistory.slice(0, 50);
        saveRoomHistory(roomHistory);

        console.log('[Meeland RoomHistory] Joined room ' + roomId + (roomName ? ' (' + roomName + ')' : '') + ' — ' + gameMode);
        logEvent('room', 'Joined ' + getFriendlyGameName(gameMode) + (roomName && roomName !== gameMode ? ' — ' + roomName : ''));

        if (activeView === 'settings' && activeTab === 'history' && isDashOpen) {
            updateTabContent();
        }
    }

    // ====================================================
    // 5b. COLYSEUS ROOM JOIN HOOK
    //
    // Confirmed via live inspection: the room id is NOT a plain
    // property on GameGlobals or on the NetworkManager script
    // instance (it exposes serverURL/isConnecting/playerArray etc.
    // but nothing identifying the room itself). The game uses the
    // Colyseus client library (exposed globally as window.Colyseus)
    // to join rooms, and the room's id/sessionId only exists on the
    // Room object returned by Client.prototype.join / joinOrCreate /
    // reconnect / joinById once that call resolves. Patch those
    // methods, same approach as the fetch/XHR sky-swap hooks above.
    // ====================================================
    function hookColyseusRoomJoins() {
        try {
            const w = getWin();
            const Colyseus = w.Colyseus || window.Colyseus;
            const proto = Colyseus?.Client?.prototype;
            if (!proto || proto.__meelandRoomHooked) return;

            ['joinOrCreate', 'join', 'reconnect', 'joinById', 'consumeSeatReservation'].forEach((methodName) => {
                const original = proto[methodName];
                if (typeof original !== 'function') return;

                proto[methodName] = function (...args) {
                    const result = original.apply(this, args);
                    if (result && typeof result.then === 'function') {
                        result.then((room) => {
                            try {
                                const roomId = room?.roomId || room?.id;
                                if (roomId && String(roomId) !== lastRecordedRoomId) {
                                    lastRecordedRoomId = String(roomId);
                                    // The room-type key (Colyseus calls this "roomName" —
                                    // e.g. "TowerParkour", "SwordRNG", "Hub") is passed as
                                    // the first argument to the join call itself, which is
                                    // more reliable than room.name on the resolved object
                                    // (that's not always populated, e.g. on reconnect).
                                    const modeArg = typeof args[0] === 'string' ? args[0] : '';
                                    const mode = modeArg || room?.name || getGameMode();
                                    addRoomToHistory(roomId, mode, mode);
                                }
                            } catch (_) {}
                        }).catch(() => {});
                    }
                    return result;
                };
            });

            proto.__meelandRoomHooked = true;
        } catch (_) {}
    }

    function scanRoomFromGame() {
        try { hookColyseusRoomJoins(); } catch (_) {}
        try {
            // GameGlobals and the NetworkManager entity walk are kept as
            // harmless fallbacks in case a future game update exposes the
            // room id there, but as of this writing neither has it — the
            // Colyseus hook above is the real detection path.
            const w = getWin();
            const globals = (w && w.GameGlobals) || (typeof window !== 'undefined' && window.GameGlobals) || null;
            const globalRoomId = globals?.roomId ?? globals?.currentRoomId;
            if (globalRoomId && String(globalRoomId) !== lastRecordedRoomId) {
                lastRecordedRoomId = String(globalRoomId);
                addRoomToHistory(globalRoomId, globals?.roomName || '', getGameMode());
                return;
            }

            const app = getApp();
            const nm = app?.root?.findByName?.('NetworkManager')?.script?.networkManager;
            if (nm?.roomId && String(nm.roomId) !== lastRecordedRoomId) {
                lastRecordedRoomId = String(nm.roomId);
                addRoomToHistory(nm.roomId, nm.roomName || '', getGameMode());
                return;
            }

            const url = new URL(window.location.href);
            const roomId = url.searchParams.get('roomId') || url.searchParams.get('room_id');
            if (roomId && roomId !== lastRecordedRoomId) {
                lastRecordedRoomId = roomId;
                addRoomToHistory(roomId, url.searchParams.get('roomName') || '', getGameMode());
            }
        } catch (_) {}
    }

    // ====================================================
    // 5c. ROLL RESULT → DISCORD WEBHOOK NOTIFIER
    //
    // Posts your own roll results to a Discord webhook when a
    // qualifying (rare enough) drop comes in. Only ever reads
    // your own session's player name and roll data — nothing
    // about other players is sent anywhere.
    // ====================================================
    let petIconMapCache = null;

    function buildPetIconMap() {
        if (petIconMapCache) return petIconMapCache;
        const map = {};
        try {
            const app = getApp();
            (app?.assets?.filter?.(a => a.name && a.name.startsWith('PetIcon-')) || []).forEach(a => {
                const petName = a.name.replace('PetIcon-', '').replace('.png', '');
                try { map[petName] = new URL(a.file.url, window.location.origin).href; } catch (_) {}
            });
        } catch (_) {}
        petIconMapCache = map;
        return map;
    }

    function formatCube(c) {
        return [
            'Name: ' + c.name,
            'Size: ' + c.size,
            'Mutation: ' + c.mutation,
            'Health: ' + c.health,
            'Damage: ' + c.damage,
            'Rarity: 1/' + Number(c.rarity).toLocaleString()
        ].join('\n');
    }

    async function postRollToDiscord(playerName, cubes) {
        const url = cfg.webhook?.url;
        if (!url) return;

        const rewardsText = cubes.map(formatCube).join('\n\n');
        const petIconMap = buildPetIconMap();
        const firstPetIcon = petIconMap[cubes[0]?.name];

        const embed = {
            title: 'Roll Result',
            color: 0x57f287,
            fields: [
                { name: 'Player', value: '\n' + playerName + '\n' },
                { name: 'Rewards', value: '\n' + rewardsText + '\n' }
            ],
            footer: { text: String(playerName) },
            timestamp: new Date().toISOString()
        };
        if (firstPetIcon) embed.thumbnail = { url: firstPetIcon };

        const payload = { username: 'Meeland Hub', embeds: [embed] };
        if (cfg.webhook?.pingEveryone) payload.content = '@everyone';

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log('[Meeland Webhook] Response:', res.status);
            logEvent('webhook', 'Pinged Discord — ' + cubes.length + ' rare drop' + (cubes.length > 1 ? 's' : '') + ' (' + playerName + ')');
        } catch (err) {
            console.error('[Meeland Webhook] Failed:', err);
            logEvent('error', 'Discord webhook failed to send');
        }
    }

    function hookRollWebhook() {
        try {
            const app = getApp();
            if (!app || app.__meelandRollHooked) return;

            const room = app.root?.findByName?.('PlayersManager')?.script?.swordRNGPlayersManager?.networkManagerScript?.room;
            if (!room) return; // Not in SwordRNG / not loaded yet — try again on the next init() tick.

            app.on('RollManager:RollResult', (data) => {
                try {
                    if (!cfg.webhook?.enabled || !cfg.webhook?.url) return;
                    const me = room.state?.players?.get?.(room.sessionId);
                    const playerName = me?.username || 'Unknown';
                    const minRarity = cfg.webhook?.minRarity || 0;
                    const qualifying = (data?.cubes || []).filter(c => c.rarity >= minRarity);
                    if (!qualifying.length) return;
                    postRollToDiscord(playerName, qualifying);
                } catch (_) {}
            });

            app.__meelandRollHooked = true;
            console.log('[Meeland Webhook] Roll listener attached.');
        } catch (_) {}
    }

    function joinRoom(room) {
        if (!room?.roomId) return;
        const url = new URL('https://meeland.io/');
        url.searchParams.set('roomId', String(room.roomId));
        // roomName here is the Colyseus room-type key (TowerParkour, SwordRNG,
        // Hub, ...) — needed so the client routes to the right scene before
        // it attempts to join this specific roomId. Every other place in the
        // original codebase paired these two params together; dropping
        // roomName is why joining stopped working.
        if (room.roomName) url.searchParams.set('roomName', String(room.roomName));
        console.log('[Meeland RoomHistory] Rejoining room ' + room.roomId + (room.roomName ? ' (' + room.roomName + ')' : ''));
        window.location.href = url.href;
    }

    // ====================================================
    // 5d. ACTIVITY LOG & TOAST NOTIFICATIONS
    //
    // A lightweight event feed so things like "rare drop pinged",
    // "room joined", "sky swapped" are visible without opening
    // devtools — logEvent() fires a corner toast AND appends to a
    // persisted log readable from the new Activity tab.
    // ====================================================
    const ACTIVITY_STORAGE_KEY = 'meeland_activity_log';
    const ACTIVITY_ICONS = { room: '🔗', webhook: '📡', camera: '🌙', hotkey: '⌨️', error: '⚠️', info: 'ℹ️' };
    const TOAST_ACCENTS = { room: '#19C7C7', webhook: '#57F287', camera: '#A78BFA', hotkey: '#FBBF24', error: '#F87171', info: '#19C7C7' };

    function loadActivityLog() {
        try {
            const data = localStorage.getItem(ACTIVITY_STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (_) { return []; }
    }

    function saveActivityLog(list) {
        try { localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
    }

    let activityLog = loadActivityLog();
    let unseenActivityCount = 0;

    function updateActivityBadge() {
        try {
            const dot = document.getElementById('ml-activity-dot');
            if (dot) dot.style.display = unseenActivityCount > 0 ? 'block' : 'none';
            const tabBadge = document.getElementById('ml-activity-tab-count');
            if (tabBadge) {
                tabBadge.textContent = String(unseenActivityCount);
                tabBadge.style.display = unseenActivityCount > 0 ? 'inline-flex' : 'none';
            }
        } catch (_) {}
    }

    let toastContainer = null;
    function ensureToastContainer() {
        try {
            if (toastContainer && (document.body?.contains(toastContainer) || document.documentElement?.contains(toastContainer))) return toastContainer;
            const targetParent = document.body || document.documentElement;
            if (!targetParent) return null;
            toastContainer = document.createElement('div');
            toastContainer.id = 'ml-toast-container';
            toastContainer.style.cssText = 'position:fixed;top:60px;right:20px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none;font-family:\'Lilita One\',system-ui,-apple-system,sans-serif;';
            targetParent.appendChild(toastContainer);
            return toastContainer;
        } catch (_) { return null; }
    }

    function showToast(type, message) {
        try {
            const container = ensureToastContainer();
            if (!container) return;

            const accent = TOAST_ACCENTS[type] || TOAST_ACCENTS.info;
            const icon = ACTIVITY_ICONS[type] || ACTIVITY_ICONS.info;

            const toast = document.createElement('div');
            toast.style.cssText = 'display:flex;align-items:center;gap:10px;background:#111111;border:1px solid #242424;border-left:3px solid ' + accent + ';color:#fff;padding:10px 14px;border-radius:8px;font-size:12.5px;letter-spacing:0.3px;box-shadow:0 8px 24px rgba(0,0,0,0.5);max-width:320px;opacity:0;transform:translateX(16px);transition:opacity 0.22s ease, transform 0.22s ease;pointer-events:auto;';
            toast.innerHTML = '<span style="font-size:15px;line-height:1;">' + icon + '</span><span style="line-height:1.4;">' + String(message).replace(/</g, '&lt;') + '</span>';

            container.appendChild(toast);
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(0)';
            });

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(16px)';
                setTimeout(() => { try { toast.remove(); } catch (_) {} }, 240);
            }, 4200);
        } catch (_) {}
    }

    function logEvent(type, message) {
        const entry = { type: type || 'info', message: String(message), time: Date.now() };
        activityLog.unshift(entry);
        activityLog = activityLog.slice(0, 50);
        saveActivityLog(activityLog);

        const isActivityTabOpen = isDashOpen && activeView === 'settings' && activeTab === 'activity';
        if (isActivityTabOpen) {
            updateTabContent();
        } else {
            unseenActivityCount++;
            updateActivityBadge();
        }

        showToast(entry.type, entry.message);
    }

    function renderActivityRow(entry) {
        const icon = ACTIVITY_ICONS[entry.type] || ACTIVITY_ICONS.info;
        const timeStr = new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:#111111;border:1px solid #242424;border-radius:6px;">' +
            '<span style="font-size:15px;line-height:1.3;">' + icon + '</span>' +
            '<div style="flex:1;min-width:0;"><div style="font-size:13px;color:#e0e0e0;letter-spacing:0.3px;line-height:1.4;">' + String(entry.message).replace(/</g, '&lt;') + '</div></div>' +
            '<div style="font-size:11px;color:#666666;font-family:monospace;white-space:nowrap;">' + timeStr + '</div>' +
        '</div>';
    }

    function renderActivityTab() {
        unseenActivityCount = 0;
        updateActivityBadge();

        const header = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
            '<div><div style="font-weight:700;font-size:14.5px;letter-spacing:0.4px;color:#fff;">Activity Log</div><div style="font-size:12.5px;letter-spacing:0.3px;color:#999999;margin-top:3px;">Recent drops, room joins, and settings changes</div></div>' +
            '<button id="ml-clear-activity" style="background:#171717;border:1px solid #292929;color:#999999;padding:7px 14px;border-radius:6px;font-size:12px;letter-spacing:0.3px;font-weight:700;cursor:pointer;">Clear All</button>' +
        '</div>';

        const body = !activityLog.length
            ? '<div style="padding:60px 20px;text-align:center;color:#666666;font-size:14px;letter-spacing:0.3px;background:#111111;border-radius:6px;border:1px solid #242424;">Nothing here yet — activity shows up as it happens.</div>'
            : '<div style="display:flex;flex-direction:column;gap:6px;max-height:360px;overflow-y:auto;">' + activityLog.map(renderActivityRow).join('') + '</div>';

        return '<div class="ml-fade-in" style="display:flex;flex-direction:column;gap:12px;">' + header + body + '</div>';
    }

    // ====================================================
    // 5e. HOTKEY REMAPPING
    //
    // Click a bind, press any key to capture it (Esc cancels).
    // Stored as e.code (layout-independent) under cfg.hotkeys,
    // synced to the standalone AutoJoin script at the bottom of
    // this file via localStorage so F2 stays in sync everywhere.
    // ====================================================
    const HOTKEY_ACTIONS = [
        { id: 'dashboard', label: 'Open Dashboard', desc: 'Opens the Meeland Client gateway menu' },
        { id: 'autoJoin', label: 'Auto-Join From Clipboard', desc: 'Joins the room link currently on your clipboard' },
        { id: 'roomHistory', label: 'Quick Room History', desc: 'Jumps straight to the Room History tab' },
        { id: 'reload', label: 'Reload Page', desc: 'Reloads the game' },
        { id: 'fpvToggle', label: 'Toggle First Person', desc: 'Switches between first and third person camera' }
    ];

    let capturingHotkeyAction = null;

    function codeToLabel(code) {
        if (!code) return '—';
        if (code.startsWith('Key')) return code.slice(3);
        if (code.startsWith('Digit')) return code.slice(5);
        if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
        const SPECIAL = {
            Period: '.', Comma: ',', Space: 'SPACE', Slash: '/', Backquote: '`',
            Minus: '-', Equal: '=', Escape: 'ESC',
            ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→'
        };
        return SPECIAL[code] || code.toUpperCase();
    }

    function renderHotkeyRow(action) {
        const currentCode = cfg.hotkeys?.[action.id];
        const isCapturing = capturingHotkeyAction === action.id;
        const keyLabel = isCapturing ? 'PRESS A KEY…' : codeToLabel(currentCode);
        const btnBg = isCapturing ? '#19C7C7' : '#171717';
        const btnColor = isCapturing ? '#000000' : '#fff';
        const btnBorder = isCapturing ? '#19C7C7' : '#292929';
        return card(
            '<div><div style="font-weight:700;font-size:14px;letter-spacing:0.4px;color:#fff;">' + action.label + '</div><div style="font-size:12.5px;letter-spacing:0.3px;color:#999999;margin-top:3px;">' + action.desc + '</div></div>' +
            '<button class="ml-hotkey-rebind" data-action="' + action.id + '" style="min-width:110px;padding:7px 14px;border-radius:6px;font-size:12px;letter-spacing:0.5px;font-weight:800;background:' + btnBg + ';color:' + btnColor + ';border:1px solid ' + btnBorder + ';cursor:pointer;font-family:monospace;' + (isCapturing ? 'animation:mlPulse 1s ease-in-out infinite;' : '') + '">' + keyLabel + '</button>',
            'display:flex;justify-content:space-between;align-items:center;'
        );
    }

    function renderHotkeysTab() {
        const header = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
            '<div><div style="font-weight:700;font-size:14.5px;letter-spacing:0.4px;color:#fff;">Keybinds</div><div style="font-size:12.5px;letter-spacing:0.3px;color:#999999;margin-top:3px;">Click a bind, then press any key to rebind it. ' + kbd('ESC') + ' cancels.</div></div>' +
            '<button id="ml-hotkeys-reset" style="background:#171717;border:1px solid #292929;color:#999999;padding:7px 14px;border-radius:6px;font-size:12px;letter-spacing:0.3px;font-weight:700;cursor:pointer;">Reset Defaults</button>' +
        '</div>';

        const rows = HOTKEY_ACTIONS.map(renderHotkeyRow).join('');

        return '<div class="ml-fade-in" style="display:flex;flex-direction:column;gap:14px;">' + header + rows + '</div>';
    }

    // ====================================================
    // 6. EXACT WIREFRAME KEYBOARD (THIN TEKO FONT)
    // ====================================================
    let keystrokeContainer = null;
    const keyState = {
        Tab: false, KeyQ: false, KeyW: false, KeyE: false, KeyR: false,
        KeyA: false, KeyS: false, KeyD: false, KeyF: false,
        ShiftLeft: false, ShiftRight: false, KeyZ: false, KeyX: false, KeyC: false, KeyV: false,
        ControlLeft: false, ControlRight: false, Space: false
    };

    function createKeyboardHud() {
        if (keystrokeContainer && (document.body?.contains(keystrokeContainer) || document.documentElement?.contains(keystrokeContainer))) return;
        const targetParent = document.body || document.documentElement;
        if (!targetParent) return;

        keystrokeContainer = document.createElement('div');
        keystrokeContainer.id = 'ml-keyboard';
        keystrokeContainer.style.cssText = 'position:fixed;bottom:24px;right:28px;z-index:2147483640;pointer-events:none;user-select:none;display:flex;flex-direction:column;align-items:flex-start;gap:4px;filter:drop-shadow(0 6px 16px rgba(0,0,0,0.85));';
        targetParent.appendChild(keystrokeContainer);
        renderKeyboardHud();
    }

    function renderKeyboardHud() {
        if (!keystrokeContainer || !cfg.keyboard?.enabled) {
            if (keystrokeContainer) keystrokeContainer.style.display = 'none';
            return;
        }
        keystrokeContainer.style.display = 'flex';
        keystrokeContainer.style.opacity = String(cfg.keyboard?.opacity || 0.95);

        const renderKey = (isPressed, label, width = 34, height = 34, fontSize = 21, spacing = 0.5) => {
            const bg = isPressed ? '#ffffff' : 'rgba(10, 2, 4, 0.9)';
            const border = isPressed ? '#ffffff' : 'rgba(235, 235, 235, 0.85)';
            const color = isPressed ? '#000000' : '#ffffff';

            return '<div style="width:' + width + 'px;height:' + height + 'px;background:' + bg + ';border:1.5px solid ' + border + ';color:' + color + ';border-radius:4px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;transform:skewX(-14deg);transition:all 0.05s ease;">' +
                '<span style="font-family:\'Lilita One\', cursive;font-size:' + fontSize + 'px;font-weight:400;line-height:0.85;letter-spacing:' + spacing + 'px;transform:skewX(0deg);display:inline-block;padding-top:2px;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;">' + label + '</span>' +
            '</div>';
        };

        const isShift = keyState.ShiftLeft || keyState.ShiftRight;
        const isCtrl = keyState.ControlLeft || keyState.ControlRight;

        // Multi-letter labels (TAB, SHIFT, CTRL) are the ones that were
        // cramping together at these font sizes, so they get a slightly
        // wider box and more letter-spacing than the single-letter keys.
        let html = '';
        html += '<div style="display:flex;gap:4px;">' +
            renderKey(keyState.Tab, 'TAB', 50, 34, 17, 1.5) +
            renderKey(keyState.KeyQ, 'Q', 34, 34, 22) +
            renderKey(keyState.KeyW, 'W', 34, 34, 22) +
            renderKey(keyState.KeyE, 'E', 34, 34, 22) +
            renderKey(keyState.KeyR, 'R', 34, 34, 22) +
        '</div>';

        html += '<div style="display:flex;gap:4px;margin-left:36px;">' +
            renderKey(keyState.KeyA, 'A', 34, 34, 22) +
            renderKey(keyState.KeyS, 'S', 34, 34, 22) +
            renderKey(keyState.KeyD, 'D', 34, 34, 22) +
            renderKey(keyState.KeyF, 'F', 34, 34, 22) +
        '</div>';

        html += '<div style="display:flex;gap:4px;">' +
            renderKey(isShift, 'SHIFT', 58, 34, 15, 1.5) +
            renderKey(keyState.KeyZ, 'Z', 34, 34, 22) +
            renderKey(keyState.KeyX, 'X', 34, 34, 22) +
            renderKey(keyState.KeyC, 'C', 34, 34, 22) +
            renderKey(keyState.KeyV, 'V', 34, 34, 22) +
        '</div>';

        html += '<div style="display:flex;gap:4px;">' +
            renderKey(isCtrl, 'CTRL', 54, 34, 15, 1.5) +
            renderKey(keyState.Space, '', 152, 34, 20) +
        '</div>';

        keystrokeContainer.innerHTML = html;
    }

    // ====================================================
    // 7. GATEWAY & DASHBOARD MODAL WITH ZERO JANK
    // ====================================================
    let dashModal = null;
    let dashBackdrop = null;
    let floatBtn = null;
    let isDashOpen = false;
    let activeView = 'gateway'; // 'gateway' | 'settings'
    let activeTab = 'camera';   // 'camera' | 'history' | 'keyboard' | 'settings'
    let isMorphing = false;

    function createFloatingBtn() {
        if (floatBtn && (document.body?.contains(floatBtn) || document.documentElement?.contains(floatBtn))) return;
        const targetParent = document.body || document.documentElement;
        if (!targetParent) return;

        floatBtn = document.createElement('div');
        floatBtn.id = 'ml-float-btn';
        floatBtn.style.cssText = 'position:fixed;top:14px;left:465px;transform:translate(calc(-100% - 16px), 0);z-index:2147483647;background:#111111;border:1px solid #242424;color:#FFFFFF;padding:6px 14px;border-radius:6px;font-family:\'Lilita One\',system-ui,-apple-system,sans-serif;font-size:12px;font-weight:400;display:flex;align-items:center;gap:10px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.5);user-select:none;pointer-events:auto;transition:background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;';

        floatBtn.innerHTML = '<div style="width:6px;height:6px;border-radius:50%;background:#19C7C7;pointer-events:none;"></div><span style="letter-spacing:0.5px;color:#FFFFFF;pointer-events:none;">Meeland Client</span><kbd style="background:#0D0D0D;color:#19C7C7;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;border:1px solid #242424;font-family:monospace;pointer-events:none;">' + codeToLabel(cfg.hotkeys?.dashboard || 'F9') + '</kbd><span id="ml-activity-dot" style="display:none;position:absolute;top:-3px;right:-3px;width:8px;height:8px;border-radius:50%;background:#F87171;border:1.5px solid #0D0D0D;pointer-events:none;"></span>';

        ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'contextmenu'].forEach(evt => {
            floatBtn.addEventListener(evt, (e) => e.stopPropagation(), false);
        });

        floatBtn.addEventListener('mouseenter', () => {
            unlockMouse();
            floatBtn.style.transform = 'translate(calc(-100% - 16px), -1px)';
            floatBtn.style.background = '#171717';
            floatBtn.style.borderColor = '#303030';
        });
        floatBtn.addEventListener('mouseleave', () => {
            floatBtn.style.transform = 'translate(calc(-100% - 16px), 0)';
            floatBtn.style.background = '#111111';
            floatBtn.style.borderColor = '#242424';
        });

        floatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDashboard();
        }, false);

        targetParent.appendChild(floatBtn);
        updateActivityBadge();
    }

    function toggleDashboard(forcedState) {
        const nextState = forcedState !== undefined ? forcedState : !isDashOpen;
        if (!dashModal) buildDashboardModal();

        if (nextState) {
            isDashOpen = true;
            unlockMouse();
            renderDashboardContent();

            dashBackdrop.style.display = 'block';
            dashModal.style.display = 'flex';

            setTimeout(() => {
                dashBackdrop.style.opacity = '1';
                dashModal.style.opacity = '1';
                dashModal.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
        } else {
            isDashOpen = false;
            capturingHotkeyAction = null;
            dashBackdrop.style.opacity = '0';
            dashModal.style.opacity = '0';
            dashModal.style.transform = 'translate(-50%, -50%) scale(0.96)';

            setTimeout(() => {
                if (!isDashOpen) {
                    dashBackdrop.style.display = 'none';
                    dashModal.style.display = 'none';
                }
            }, 220);
        }
    }

    function switchViewWithAnimation(targetView) {
        if (isMorphing || activeView === targetView) return;
        isMorphing = true;

        const wrapper = dashModal.querySelector('.ml-content-wrapper');
        if (wrapper) {
            wrapper.classList.remove('ml-fade-in');
            wrapper.classList.add('ml-fade-out');
        }

        setTimeout(() => {
            activeView = targetView;
            renderDashboardContent();
            isMorphing = false;
        }, 120);
    }

    function switchTab(targetTab) {
        if (activeTab === targetTab) return;
        capturingHotkeyAction = null;
        activeTab = targetTab;

        dashModal.querySelectorAll('.ml-tbtn').forEach(btn => {
            const isMatch = btn.getAttribute('data-tab') === targetTab;
            btn.style.borderColor = isMatch ? 'rgba(25,199,199,0.5)' : 'transparent';
            btn.style.background = isMatch ? 'rgba(25,199,199,0.12)' : 'transparent';
            btn.style.color = isMatch ? '#19C7C7' : '#999999';
            const icon = btn.querySelector('span:first-child');
            if (icon) icon.style.color = isMatch ? '#19C7C7' : '#999999';
        });

        updateTabContent();
    }

    function buildDashboardModal() {
        if (dashModal && (document.body?.contains(dashModal) || document.documentElement?.contains(dashModal))) return;
        const targetParent = document.body || document.documentElement;
        if (!targetParent) return;

        dashBackdrop = document.createElement('div');
        dashBackdrop.id = 'ml-dash-backdrop';
        dashBackdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0, 0, 0, 0.75);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);z-index:2147483646;display:none;opacity:0;pointer-events:auto;cursor:default;';

        ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'contextmenu'].forEach(evt => {
            dashBackdrop.addEventListener(evt, (e) => e.stopPropagation(), false);
        });

        dashBackdrop.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDashboard(false);
        }, false);

        targetParent.appendChild(dashBackdrop);

        dashModal = document.createElement('div');
        dashModal.id = 'ml-dashboard';
        dashModal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.96);opacity:0;z-index:2147483647;display:none;flex-direction:column;color:#FFFFFF;font-family:\'Lilita One\',system-ui,-apple-system,sans-serif;overflow:hidden;user-select:none;pointer-events:auto;';

        // Bubble Phase Event Isolation
        ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'contextmenu', 'wheel'].forEach(evt => {
            dashModal.addEventListener(evt, (e) => {
                e.stopPropagation();
            }, { capture: false, passive: evt === 'wheel' });
        });

        // Scroll-to-reveal tab nav. The tab strip (Camera, History,
        // Keyboard, Hotkeys, Activity, Settings...) can overflow wider
        // than the modal with no visible scrollbar (ml-no-scrollbar),
        // so tabs like Settings can end up unreachable by click alone.
        // Delegated on dashModal (not the scroll container itself)
        // since renderDashboardContent() rebuilds that container's
        // innerHTML on every view/tab switch, which would drop a
        // directly-attached listener.
        dashModal.addEventListener('wheel', (e) => {
            const scrollArea = e.target.closest('#ml-tab-nav-scroll');
            if (!scrollArea) return;
            scrollArea.scrollLeft += (e.deltaY || e.deltaX);
            updateTabNavScrollHint();
        }, { passive: true });

        // 'scroll' doesn't bubble, so this has to be a capture-phase
        // listener to catch it via delegation on dashModal (the
        // scroll container itself gets torn down/rebuilt on every
        // renderDashboardContent() call, same reasoning as above).
        dashModal.addEventListener('scroll', (e) => {
            if (e.target && e.target.id === 'ml-tab-nav-scroll') {
                updateTabNavScrollHint();
            }
        }, { capture: true, passive: true });

        window.addEventListener('resize', () => {
            if (dashModal && dashModal.style.display !== 'none') {
                updateTabNavScrollHint();
            }
        }, { passive: true });

        // Event Delegation
        dashModal.addEventListener('click', (e) => {
            e.stopPropagation();

            // 1. Close Button
            if (e.target.closest('#ml-close')) {
                toggleDashboard(false);
                return;
            }

            // 2. Open Settings from Gateway
            if (e.target.closest('#ml-enter-settings') || e.target.closest('#ml-gateway-badge-card')) {
                switchViewWithAnimation('settings');
                return;
            }

            // 3. Back to Gateway
            if (e.target.closest('#ml-back-gateway')) {
                switchViewWithAnimation('gateway');
                return;
            }

            // 4. Tab Navigation
            const tabBtn = e.target.closest('.ml-tbtn');
            if (tabBtn) {
                const tab = tabBtn.getAttribute('data-tab');
                if (tab) switchTab(tab);
                return;
            }

            // 5. FPV Toggle
            if (e.target.closest('#ml-fpv-toggle')) {
                cfg.camera.firstPerson = !cfg.camera.firstPerson;
                saveCfg();
                updateTabContent();
                return;
            }

            // 6. Hide Body Toggle
            if (e.target.closest('#ml-hide-body')) {
                cfg.camera.hideBodyInFpv = !cfg.camera.hideBodyInFpv;
                saveCfg();
                updateTabContent();
                return;
            }

            // 7. SkySwap Toggle
            if (e.target.closest('#ml-skyswap-toggle')) {
                cfg.camera.skySwapEnabled = !cfg.camera.skySwapEnabled;
                saveCfg();
                updateTabContent();
                logEvent('camera', cfg.camera.skySwapEnabled ? 'SkySwap enabled — custom texture active' : 'SkySwap disabled — reverted to default sky');
                // Try to apply immediately. If the sky asset hasn't loaded
                // yet in this session (e.g. still on the gateway screen),
                // there's nothing to refresh — the new setting will simply
                // apply the first time it loads, which is fine.
                if (!refreshSkyLive()) {
                    console.log('[Meeland SkySwap] No live sky asset found yet — setting will apply on next load.');
                }
                return;
            }

            // 8. Clear History
            if (e.target.closest('#ml-clear-history')) {
                roomHistory = [];
                saveRoomHistory(roomHistory);
                updateTabContent();
                return;
            }

            // 9. Join Room
            const joinBtn = e.target.closest('.ml-join-btn');
            if (joinBtn) {
                const idx = parseInt(joinBtn.getAttribute('data-idx'), 10);
                if (roomHistory[idx]) joinRoom(roomHistory[idx]);
                return;
            }

            // 10. Keyboard HUD Toggle
            if (e.target.closest('#ml-kb-toggle')) {
                cfg.keyboard.enabled = !cfg.keyboard.enabled;
                saveCfg();
                renderKeyboardHud();
                updateTabContent();
                return;
            }

            // 12. Floating Pill Toggle
            if (e.target.closest('#ml-pill-toggle')) {
                if (!cfg.hud) cfg.hud = {};
                cfg.hud.showFloatingToggle = !cfg.hud.showFloatingToggle;
                saveCfg();
                if (floatBtn) floatBtn.style.display = cfg.hud.showFloatingToggle ? 'flex' : 'none';
                updateTabContent();
                return;
            }

            // 13. Webhook Enabled Toggle
            if (e.target.closest('#ml-webhook-toggle')) {
                if (!cfg.webhook) cfg.webhook = {};
                cfg.webhook.enabled = !cfg.webhook.enabled;
                saveCfg();
                updateTabContent();
                return;
            }

            // 14. Webhook @everyone Ping Toggle
            if (e.target.closest('#ml-webhook-ping-toggle')) {
                if (!cfg.webhook) cfg.webhook = {};
                cfg.webhook.pingEveryone = cfg.webhook.pingEveryone === false;
                saveCfg();
                updateTabContent();
                return;
            }

            // 15. Hotkey Rebind — start capturing
            const rebindBtn = e.target.closest('.ml-hotkey-rebind');
            if (rebindBtn) {
                capturingHotkeyAction = rebindBtn.getAttribute('data-action');
                updateTabContent();
                return;
            }

            // 16. Hotkeys Reset To Defaults
            if (e.target.closest('#ml-hotkeys-reset')) {
                cfg.hotkeys = { ...DEFAULT_HOTKEYS };
                saveCfg();
                capturingHotkeyAction = null;
                updateTabContent();
                logEvent('hotkey', 'Hotkeys reset to defaults');
                return;
            }

            // 17. Clear Activity Log
            if (e.target.closest('#ml-clear-activity')) {
                activityLog = [];
                saveActivityLog(activityLog);
                updateTabContent();
                return;
            }

        }, false);

        // FOV Slider Input
        dashModal.addEventListener('input', (e) => {
            e.stopPropagation();
            if (e.target && e.target.id === 'ml-fov') {
                cfg.camera.fov = parseInt(e.target.value, 10);
                saveCfg();
                const fovTxt = document.getElementById('ml-fov-txt');
                if (fovTxt) fovTxt.textContent = cfg.camera.fov + '°';
                return;
            }

            // Webhook URL Input
            if (e.target && e.target.id === 'ml-webhook-url') {
                if (!cfg.webhook) cfg.webhook = {};
                cfg.webhook.url = e.target.value.trim();
                saveCfg();
                return;
            }

            // Webhook Min Rarity Input
            if (e.target && e.target.id === 'ml-webhook-rarity') {
                if (!cfg.webhook) cfg.webhook = {};
                const n = parseInt(e.target.value, 10);
                cfg.webhook.minRarity = Number.isFinite(n) && n >= 0 ? n : 0;
                saveCfg();
                return;
            }
        }, false);

        targetParent.appendChild(dashModal);
    }

    function renderDashboardContent() {
        if (!dashModal) return;

        // ==========================================
        // VIEW A: GATEWAY ENTRANCE INTERFACE
        // ==========================================
        if (activeView === 'gateway') {
            dashModal.style.width = '420px';
            dashModal.style.maxWidth = '92vw';
            dashModal.style.height = '370px';
            dashModal.style.maxHeight = '90vh';
            dashModal.style.background = 'radial-gradient(circle at 50% 20%, #131313 0%, #0d0d0d 60%, #090909 100%)';
            dashModal.style.border = '1px solid #242424';
            dashModal.style.borderRadius = '16px';
            dashModal.style.boxShadow = '0 25px 60px -10px rgba(0,0,0,0.65)';

            dashModal.innerHTML = `
                <div class="ml-content-wrapper ml-fade-in" style="padding:32px 28px;display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;width:100%;height:100%;box-sizing:border-box;justify-content:center;">
                    <button id="ml-close" style="position:absolute;top:16px;right:16px;background:#111111;border:1px solid #242424;color:#999999;border-radius:6px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:bold;font-size:12px;transition:all 0.15s ease;" onmouseover="this.style.background='#171717';this.style.color='#FFFFFF'" onmouseout="this.style.background='#111111';this.style.color='#999999'">✕</button>

                    <div id="ml-gateway-badge-card" style="cursor:pointer;margin-bottom:16px;transition:transform 0.2s ease;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
                        ${getGatewayLogoMarkup()}
                    </div>

                    <div style="font-family:'Lilita One',system-ui,-apple-system,sans-serif;font-weight:400;font-size:21px;letter-spacing:2px;color:#ffffff;">
                        MEELAND <span style="color:#19C7C7;">CLIENT</span>
                    </div>
                    <div style="font-size:11px;color:#666666;font-weight:700;letter-spacing:1.4px;margin-top:5px;margin-bottom:20px;text-transform:uppercase;opacity:0.9;">
                        Meeland Client Dashboard
                    </div>

                    <button id="ml-enter-settings" style="width:100%;padding:13px 20px;background:#19C7C7;border:1px solid #19C7C7;color:#000000;border-radius:8px;font-weight:800;font-size:13px;letter-spacing:1px;cursor:pointer;box-shadow:none;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.18s ease;" onmouseover="this.style.transform='translateY(-1px)';this.style.background='#22D6D6';" onmouseout="this.style.transform='none';this.style.background='#19C7C7';">
                        ${ICONS.settings}
                        <span>OPEN SETTINGS & TABS</span>
                    </button>

                    <div style="display:flex;justify-content:space-between;width:100%;margin-top:16px;font-size:10.5px;color:#999999;font-weight:700;">
                        <span>HOTKEY: <kbd style="color:#19C7C7;background:#0D0D0D;padding:2px 6px;border-radius:4px;border:1px solid #242424;">${codeToLabel(cfg.hotkeys?.dashboard || 'F9')}</kbd></span>
                        <span>${codeToLabel(cfg.hotkeys?.roomHistory || 'F3')} FOR ROOM HISTORY</span>
                    </div>
                </div>
            `;
            return;
        }

        // ==========================================
        // VIEW B: FULL EXPANDED SETTINGS DASHBOARD
        // ==========================================
        dashModal.style.width = '900px';
        dashModal.style.maxWidth = '94vw';
        dashModal.style.height = '620px';
        dashModal.style.maxHeight = '92vh';
        dashModal.style.background = 'radial-gradient(circle at 50% 0%, #121212 0%, #0d0d0d 60%, #090909 100%)';
        dashModal.style.border = '1px solid #242424';
        dashModal.style.borderRadius = '10px';
        dashModal.style.boxShadow = '0 25px 60px -10px rgba(0,0,0,0.65)';

        const tabs = [
            { id: 'camera', label: 'Camera & Visuals', icon: ICONS.camera },
            { id: 'history', label: 'Room History', icon: ICONS.history },
            { id: 'keyboard', label: 'Keyboard', icon: ICONS.keyboard },
            { id: 'hotkeys', label: 'Hotkeys', icon: ICONS.hotkey },
            { id: 'activity', label: 'Activity', icon: ICONS.activity },
            { id: 'settings', label: 'Settings', icon: ICONS.settings }
        ];

        let navHtml = '<div style="display:flex;align-items:center;background:#0D0D0D;padding:12px 20px;border-bottom:1px solid #242424;gap:12px;">' +
            '<button id="ml-back-gateway" style="background:#111111;border:1px solid #242424;color:#999999;padding:6px 11px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;transition:all 0.15s ease;" onmouseover="this.style.background=\'#171717\';this.style.color=\'#FFFFFF\'" onmouseout="this.style.background=\'#111111\';this.style.color=\'#999999\'" title="Back to Gateway">◀ Hub</button>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-right:4px;">' +
                '<div style="width:7px;height:7px;border-radius:50%;background:#19C7C7;"></div>' +
                '<div style="font-weight:900;font-size:12px;letter-spacing:1px;color:#fff;white-space:nowrap;">MEELAND <span style="color:#19C7C7;">CLIENT</span></div>' +
            '</div>' +
            '<div style="position:relative;flex:1;min-width:0;overflow:hidden;">' +
                '<div id="ml-tab-nav-scroll" class="ml-no-scrollbar" style="display:flex;gap:6px;overflow-x:auto;align-items:center;scroll-behavior:smooth;">';

        tabs.forEach(tab => {
            const isActive = activeTab === tab.id;
            const badgeVisible = tab.id === 'activity' && unseenActivityCount > 0;
            const badge = tab.id === 'activity'
                ? '<span id="ml-activity-tab-count" style="background:#F87171;color:#000;font-size:10px;font-weight:900;border-radius:999px;min-width:16px;height:16px;display:' + (badgeVisible ? 'inline-flex' : 'none') + ';align-items:center;justify-content:center;padding:0 4px;pointer-events:none;">' + unseenActivityCount + '</span>'
                : '';
            navHtml += '<button class="ml-tbtn" data-tab="' + tab.id + '" style="padding:8px 16px;border-radius:6px;font-size:12.5px;letter-spacing:0.4px;font-weight:700;border:' + (isActive ? '1px solid rgba(25,199,199,0.5)' : '1px solid transparent') + ';background:' + (isActive ? 'rgba(25,199,199,0.12)' : 'transparent') + ';color:' + (isActive ? '#19C7C7' : '#999999') + ';cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.18s ease;white-space:nowrap;">' +
                '<span style="display:inline-flex;align-items:center;color:' + (isActive ? '#19C7C7' : '#999999') + ';pointer-events:none;">' + tab.icon + '</span>' +
                '<span style="pointer-events:none;">' + tab.label + '</span>' +
                badge +
            '</button>';
        });

        navHtml += '</div>' +
                '<div id="ml-tab-nav-hint"><div class="ml-scroll-pill"><span>SCROLL</span>' + ICONS.chevronRight + '</div></div>' +
            '</div>' +
            '<button id="ml-close" style="background:#111111;border:1px solid #242424;color:#999999;border-radius:6px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:bold;font-size:13px;transition:all 0.15s ease;" onmouseover="this.style.background=\'#171717\';this.style.color=\'#FFFFFF\'" onmouseout="this.style.background=\'#111111\';this.style.color=\'#999999\'" title="Close">✕</button>' +
        '</div>';

        let bodyHtml = '<div id="ml-tab-body" class="ml-red-scroll" style="flex:1;padding:24px;overflow-y:auto;background:#0D0D0D;"></div>';

        dashModal.innerHTML = '<div class="ml-content-wrapper ml-fade-in" style="display:flex;flex-direction:column;width:100%;height:100%;">' + navHtml + bodyHtml + '</div>';
        updateTabContent();
        updateTabNavScrollHint();
    }

    // ----------------------------------------------------
    // Tab-nav "more tabs" hint. The tab strip can overflow
    // wider than the modal (see the wheel-scroll comment
    // above), with no visible scrollbar, so without this a
    // tab like Settings can be invisible with no clue it's
    // reachable by scrolling. Shows a fading chevron on the
    // right edge whenever there's unscrolled overflow, and
    // hides it once the strip is scrolled to its end.
    // ----------------------------------------------------
    function updateTabNavScrollHint() {
        if (!dashModal) return;
        const scrollArea = dashModal.querySelector('#ml-tab-nav-scroll');
        const hint = dashModal.querySelector('#ml-tab-nav-hint');
        if (!scrollArea || !hint) return;
        const hasOverflow = scrollArea.scrollWidth > scrollArea.clientWidth + 2;
        const atEnd = scrollArea.scrollLeft >= (scrollArea.scrollWidth - scrollArea.clientWidth - 4);
        hint.style.opacity = (hasOverflow && !atEnd) ? '1' : '0';
    }

    // ----------------------------------------------------
    // Small render helpers shared by every settings tab, so
    // each toggle row is defined once instead of copy-pasted
    // per-tab. Output is identical to the old inline markup.
    // ----------------------------------------------------
    function card(innerHtml, extraStyle, padding) {
        return '<div style="background:#111111;border:1px solid #242424;padding:' + (padding || '16px') + ';border-radius:6px;' + (extraStyle || '') + '">' + innerHtml + '</div>';
    }

    function toggleRow(id, title, desc, enabled, onText, offText, titleSize) {
        const bg = enabled ? '#19C7C7' : '#171717';
        const fg = enabled ? '#000000' : '#999999';
        const bd = enabled ? '#19C7C7' : '#292929';
        return card(
            '<div><div style="font-weight:700;font-size:' + (titleSize || '14.5px') + ';letter-spacing:0.4px;color:#fff;">' + title + '</div><div style="font-size:12.5px;letter-spacing:0.3px;color:#999999;margin-top:3px;">' + desc + '</div></div>' +
            '<button id="' + id + '" style="padding:7px 16px;border-radius:6px;font-size:12px;letter-spacing:0.5px;font-weight:700;background:' + bg + ';color:' + fg + ';border:1px solid ' + bd + ';cursor:pointer;">' + (enabled ? onText : offText) + '</button>',
            'display:flex;justify-content:space-between;align-items:center;'
        );
    }

    function kbd(label) {
        return '<kbd style="background:#0D0D0D;padding:1px 5px;border-radius:4px;color:#19C7C7;font-size:10px;border:1px solid #242424;">' + label + '</kbd>';
    }

    function textInputRow(id, title, desc, value, placeholder, inputType) {
        const escaped = String(value ?? '').replace(/"/g, '&quot;');
        return card(
            '<div style="margin-bottom:10px;"><div style="font-weight:700;font-size:14px;letter-spacing:0.4px;color:#fff;">' + title + '</div><div style="font-size:12.5px;letter-spacing:0.3px;color:#999999;margin-top:3px;">' + desc + '</div></div>' +
            '<input type="' + (inputType || 'text') + '" id="' + id + '" value="' + escaped + '" placeholder="' + (placeholder || '') + '" autocomplete="off" spellcheck="false" style="width:100%;box-sizing:border-box;background:#0D0D0D;border:1px solid #242424;color:#fff;padding:9px 11px;border-radius:6px;font-size:12.5px;letter-spacing:0.3px;font-family:monospace;outline:none;" onfocus="this.style.borderColor=\'#19C7C7\'" onblur="this.style.borderColor=\'#242424\'">'
        );
    }

    function renderCameraTab() {
        const fovCard = card(
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
                '<div><div style="font-weight:700;font-size:14.5px;letter-spacing:0.4px;color:#fff;">Global FOV Camera Angle</div><div style="font-size:12.5px;letter-spacing:0.3px;color:#999999;margin-top:3px;">Ultra-wide field of view for high-speed tracking & PVP</div></div>' +
                '<div style="background:rgba(25, 199, 199, 0.12);border:1px solid rgba(25, 199, 199, 0.4);color:#19C7C7;padding:4px 10px;border-radius:6px;font-weight:800;font-size:13px;" id="ml-fov-txt">' + cfg.camera.fov + '°</div>' +
            '</div>' +
            '<input type="range" min="50" max="120" value="' + cfg.camera.fov + '" id="ml-fov" style="width:100%;height:4px;border-radius:2px;accent-color:#19C7C7;cursor:pointer;background:#242424;">' +
            '<div style="display:flex;justify-content:space-between;font-size:10px;color:#666666;margin-top:8px;font-weight:700;"><span>50° NARROW</span><span>75° DEFAULT</span><span>90° PRO</span><span>120° ULTRA-WIDE</span></div>',
            '',
            '18px'
        );

        const fpvRow = toggleRow('ml-fpv-toggle', 'First Person View (FPV)', 'Toggle in-game with ' + kbd(codeToLabel(cfg.hotkeys?.fpvToggle || 'Period')), cfg.camera.firstPerson, 'ENABLED', 'DISABLED', '14px');
        const hideBodyRow = toggleRow('ml-hide-body', 'Hide Body Meshes in FPV', 'Prevents player head/chest clipping', cfg.camera.hideBodyInFpv, 'ON', 'OFF', '14px');
        const skySwapRow = toggleRow('ml-skyswap-toggle', 'SkySwap Custom Texture Engine', 'Replaces default Toon sky with high-res texture', cfg.camera.skySwapEnabled, 'ACTIVE', 'OFF');

        return '<div class="ml-fade-in" style="display:flex;flex-direction:column;gap:16px;">' +
            fovCard +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' + fpvRow + hideBodyRow + '</div>' +
            skySwapRow +
        '</div>';
    }

    function renderHistoryRow(room, idx) {
        const modeLabel = getFriendlyGameName(room.gameMode);
        const roomSubtitle = room.roomName ? (room.roomName + ' • ' + room.roomId) : ('Room ' + room.roomId);
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#111111;border:1px solid #242424;border-radius:6px;">' +
            '<div style="min-width:0;flex:1;">' +
                '<div style="font-weight:700;font-size:14.5px;letter-spacing:0.4px;color:#fff;">' + modeLabel + '</div>' +
                '<div style="font-size:12.5px;color:#999999;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + roomSubtitle + '</div>' +
            '</div>' +
            '<button class="ml-join-btn" data-idx="' + idx + '" style="background:#19C7C7;color:#000000;border:none;padding:7px 16px;border-radius:6px;font-weight:800;font-size:12px;letter-spacing:0.5px;cursor:pointer;margin-left:12px;box-shadow:none;">JOIN</button>' +
        '</div>';
    }

    function renderHistoryTab() {
        const header = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
            '<div><div style="font-weight:700;font-size:14.5px;letter-spacing:0.4px;color:#fff;">Recent Joined Rooms</div><div style="font-size:12.5px;letter-spacing:0.3px;color:#999999;margin-top:3px;">Instant 1-Click Join (also accessible with ' + kbd(codeToLabel(cfg.hotkeys?.roomHistory || 'F3')) + ')</div></div>' +
            '<button id="ml-clear-history" style="background:#171717;border:1px solid #292929;color:#999999;padding:7px 14px;border-radius:6px;font-size:12px;letter-spacing:0.3px;font-weight:700;cursor:pointer;">Clear All</button>' +
        '</div>';

        const body = !roomHistory.length
            ? '<div style="padding:60px 20px;text-align:center;color:#666666;font-size:14px;letter-spacing:0.3px;background:#111111;border-radius:6px;border:1px solid #242424;">No rooms in history yet. Play games to auto-save rooms!</div>'
            : '<div style="display:flex;flex-direction:column;gap:6px;max-height:360px;overflow-y:auto;">' +
                roomHistory.map(renderHistoryRow).join('') +
              '</div>';

        return '<div class="ml-fade-in" style="display:flex;flex-direction:column;gap:12px;">' + header + body + '</div>';
    }

    function renderKeyboardTab() {
        const row = toggleRow('ml-kb-toggle', 'Enable Esports Wireframe Keyboard', 'Displays live TAB, QWER, ASDF, SHIFT ZXCV, CTRL SPACE', cfg.keyboard.enabled, 'ENABLED', 'DISABLED');
        return '<div class="ml-fade-in" style="display:flex;flex-direction:column;gap:14px;">' + row + '</div>';
    }

    function renderSettingsTab() {
        const pillVisible = cfg.hud?.showFloatingToggle !== false;
        const row = toggleRow('ml-pill-toggle', 'Floating Pill Toggle Button', 'Show the quick-access pill on screen', pillVisible, 'VISIBLE', 'HIDDEN', '14px');

        const wh = cfg.webhook || {};
        const webhookHeader = '<div style="font-weight:900;font-size:12px;letter-spacing:1px;color:#666666;margin-top:6px;">ROLL WEBHOOK NOTIFICATIONS</div>';
        const webhookEnableRow = toggleRow('ml-webhook-toggle', 'Discord Roll Notifications', 'Post your qualifying rolls to a Discord webhook', !!wh.enabled, 'ENABLED', 'DISABLED', '14px');
        const webhookUrlRow = textInputRow(
            'ml-webhook-url',
            'Webhook URL — DO NOT SHARE',
            'Anyone with this link can post to your Discord channel. Keep it private.',
            wh.url || '',
            'https://discord.com/api/webhooks/...',
            'password'
        );
        const webhookRarityRow = card(
            '<div style="margin-bottom:10px;"><div style="font-weight:700;font-size:14px;letter-spacing:0.4px;color:#fff;">Minimum Rarity To Notify</div><div style="font-size:12.5px;letter-spacing:0.3px;color:#999999;margin-top:3px;">Only post rolls at 1/N or rarer. Set to 0 to post everything.</div></div>' +
            '<input type="number" min="0" step="1" id="ml-webhook-rarity" value="' + (Number(wh.minRarity) || 0) + '" style="width:100%;box-sizing:border-box;background:#0D0D0D;border:1px solid #242424;color:#fff;padding:9px 11px;border-radius:6px;font-size:12.5px;letter-spacing:0.3px;font-family:monospace;outline:none;" onfocus="this.style.borderColor=\'#19C7C7\'" onblur="this.style.borderColor=\'#242424\'">'
        );
        const webhookPingRow = toggleRow('ml-webhook-ping-toggle', '@everyone Ping', 'Ping @everyone in the channel when a qualifying roll hits', wh.pingEveryone !== false, 'ON', 'OFF', '14px');

        return '<div class="ml-fade-in" style="display:flex;flex-direction:column;gap:14px;">' +
            row +
            webhookHeader +
            webhookEnableRow +
            webhookUrlRow +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' + webhookRarityRow + webhookPingRow + '</div>' +
        '</div>';
    }

    const TAB_RENDERERS = {
        camera: renderCameraTab,
        history: renderHistoryTab,
        keyboard: renderKeyboardTab,
        hotkeys: renderHotkeysTab,
        activity: renderActivityTab,
        settings: renderSettingsTab
    };

    function updateTabContent() {
        const bodyEl = document.getElementById('ml-tab-body');
        if (!bodyEl) return;

        const render = TAB_RENDERERS[activeTab];
        bodyEl.innerHTML = render ? render() : '';
    }

    // ====================================================
    // 8. AUTO FULLSCREEN & F2/F6/EASTER EGG
    // ====================================================
    let fullscreenStarted = false;
    async function enterFullscreen() {
        if (fullscreenStarted || document.fullscreenElement) {
            fullscreenStarted = true;
            return;
        }
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
                fullscreenStarted = true;
            }
        } catch (_) {}
    }
    window.addEventListener('load', () => setTimeout(enterFullscreen, 1000));
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) fullscreenStarted = false;
    });

    // F2 Auto Join
    async function joinFromClipboard() {
        try {
            let text = '';
            if (window.meelandClient && typeof window.meelandClient.getClipboardText === 'function') {
                text = await window.meelandClient.getClipboardText();
            } else {
                text = await navigator.clipboard.readText();
            }
            if (!text || !text.trim()) return;

            const url = new URL(text.trim());
            const host = url.hostname.toLowerCase();
            if (host !== 'meeland.io' && host !== 'www.meeland.io' && !host.includes('crazygames')) return;

            const roomId = url.searchParams.get('roomId');
            const roomName = url.searchParams.get('roomName');
            if (roomId) {
                const joinUrl = new URL('https://meeland.io/');
                joinUrl.searchParams.set('roomId', roomId);
                if (roomName) joinUrl.searchParams.set('roomName', roomName);
                window.location.href = joinUrl.href;
            }
        } catch (err) {
            console.warn('[Meeland AutoJoin] Clipboard read failed:', err);
        }
    }

    // Easter Egg (↑ ↓ ← →)
    const SECRET_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    let secretEntered = [];
    function triggerEasterEgg() {
        const old = document.getElementById('meeland-secret-easteregg');
        if (old) old.remove();

        const notif = document.createElement('div');
        notif.id = 'meeland-secret-easteregg';
        Object.assign(notif.style, {
            position: 'fixed', left: '50%', bottom: '35px', transform: 'translateX(-50%)',
            zIndex: '2147483647', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px 20px', background: '#111111', border: '1px solid #242424',
            borderRadius: '8px', color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: '18px',
            fontWeight: 'bold', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', opacity: '0', transition: 'opacity 0.3s ease'
        });

        const badge = document.createElement('img');
        badge.src = 'https://meeland.io/files/assets/299087255/1/Verif-Admin2.png?t=5bacbc67817a9118f35d5a4ac2a4ee56&v=2.0.03';
        badge.style.cssText = 'width:30px;height:30px;object-fit:contain;margin-right:10px;';
        notif.appendChild(badge);

        const txt = document.createElement('span');
        txt.textContent = 'Builderman : This was a secret..';
        notif.appendChild(txt);

        document.body.appendChild(notif);
        requestAnimationFrame(() => notif.style.opacity = '1');
        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    // ====================================================
    // 9. GLOBAL KEY LISTENERS
    // ====================================================
    function onKeyDown(e) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

        // Hotkey rebind capture takes priority over every other
        // shortcut below — otherwise pressing (say) F9 to rebind
        // "Open Dashboard" would also fire the dashboard toggle.
        if (capturingHotkeyAction) {
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();

            if (e.key === 'Escape') {
                capturingHotkeyAction = null;
                updateTabContent();
                return;
            }

            const newCode = e.code;
            const conflict = HOTKEY_ACTIONS.find(a => a.id !== capturingHotkeyAction && cfg.hotkeys?.[a.id] === newCode);
            if (conflict) {
                showToast('error', 'Already bound to "' + conflict.label + '" — pick a different key.');
                capturingHotkeyAction = null;
                updateTabContent();
                return;
            }

            if (!cfg.hotkeys) cfg.hotkeys = { ...DEFAULT_HOTKEYS };
            cfg.hotkeys[capturingHotkeyAction] = newCode;
            saveCfg();
            const actionMeta = HOTKEY_ACTIONS.find(a => a.id === capturingHotkeyAction);
            logEvent('hotkey', 'Rebound "' + (actionMeta?.label || capturingHotkeyAction) + '" to ' + codeToLabel(newCode));
            capturingHotkeyAction = null;
            updateTabContent();
            return;
        }

        // Easter Egg
        if (SECRET_KEYS.includes(e.key)) {
            secretEntered.push(e.key);
            if (secretEntered.length > SECRET_KEYS.length) secretEntered.shift();
            if (secretEntered.length === SECRET_KEYS.length && secretEntered.every((k, i) => k === SECRET_KEYS[i])) {
                triggerEasterEgg();
                secretEntered = [];
            }
        }

        // Reload (default F6, rebindable in the Hotkeys tab)
        if (e.code === (cfg.hotkeys?.reload || 'F6')) {
            e.preventDefault();
            location.reload();
            return;
        }

        // Auto Join (default F2, rebindable — kept in sync with the
        // standalone AutoJoin script at the bottom of this file via
        // localStorage, since that script runs in its own scope).
        if (e.code === (cfg.hotkeys?.autoJoin || 'F2')) {
            e.preventDefault();
            joinFromClipboard();
            return;
        }

        // Quick Room History (default F3) — opens it, and closes it
        // again if it's already open and showing history.
        if (e.code === (cfg.hotkeys?.roomHistory || 'F3')) {
            e.preventDefault();
            if (isDashOpen && activeView === 'settings' && activeTab === 'history') {
                toggleDashboard(false);
            } else {
                activeView = 'settings';
                activeTab = 'history';
                toggleDashboard(true);
            }
            return;
        }

        // Dashboard Toggle (default F9, rebindable).
        const isToggle = (e.code === (cfg.hotkeys?.dashboard || 'F9'));

        if (e.key === 'Escape' && isDashOpen) {
            e.preventDefault();
            toggleDashboard(false);
            return;
        }

        if (isToggle) {
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            activeView = 'gateway';
            toggleDashboard();
            return false;
        }

        // FPV Quick Key (default Period/".", rebindable)
        if (e.code === (cfg.hotkeys?.fpvToggle || 'Period')) {
            e.preventDefault();
            cfg.camera.firstPerson = !cfg.camera.firstPerson;
            saveCfg();
        }

        // Keyboard HUD State
        if (e.code in keyState) {
            keyState[e.code] = true;
            renderKeyboardHud();
        }
        if (e.key === 'Shift') {
            keyState.ShiftLeft = true;
            renderKeyboardHud();
        }
        if (e.key === 'Control') {
            keyState.ControlLeft = true;
            renderKeyboardHud();
        }
    }

    function onKeyUp(e) {
        if (e.code in keyState) {
            keyState[e.code] = false;
            renderKeyboardHud();
        }
        if (e.key === 'Shift') {
            keyState.ShiftLeft = false;
            keyState.ShiftRight = false;
            renderKeyboardHud();
        }
        if (e.key === 'Control') {
            keyState.ControlLeft = false;
            keyState.ControlRight = false;
            renderKeyboardHud();
        }
    }

    // Registered once each (was previously duplicated on both
    // window AND document with capture:true, which fired every
    // handler TWICE per keypress — silently cancelling out any
    // toggle-style key, like the FPV "." shortcut).
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);

    // ====================================================
    // 10. SYSTEM INITIALIZATION
    // ====================================================
    function init() {
        try { injectStyles(); } catch (_) {}
        try { showLaunchSplash(); } catch (_) {}
        try { hookCamera(); } catch (_) {}
        try { hookLoadingScreen(); } catch (_) {}
        try { createKeyboardHud(); } catch (_) {}
        if (splashDismissed) { try { createFloatingBtn(); } catch (_) {} }
        try { scanRoomFromGame(); } catch (_) {}
        try { hookRollWebhook(); } catch (_) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    setInterval(init, 500);

    // Global API
    window.MeelandClient = {
        openDashboard: () => { activeView = 'gateway'; toggleDashboard(true); },
        openSettings: () => { activeView = 'settings'; toggleDashboard(true); },
        closeDashboard: () => toggleDashboard(false),
        toggleDashboard: () => toggleDashboard(),
        joinRoom,
        getConfig: () => cfg,
        saveConfig: saveCfg,
        showLaunchSplash,
        hideLaunchSplash
    };

    console.log('[Meeland Client Suite v4.3.3] Loaded successfully.');
})();

// ====================================================
// EXTRA: Standalone AutoJoin script (autojoin.js)
// Appended as-is, independent of the dashboard UI/logic
// above. Runs its own F2 listener + console logging.
// ====================================================
(() => {
    "use strict";

    if (window.__meelandF2AutoJoin) {
        return;
    }

    window.__meelandF2AutoJoin = true;

    console.log("[AutoJoin] F2 auto-join loaded.");

    // Reads the rebindable AutoJoin key from the main dashboard's saved
    // config (cfg.hotkeys.autoJoin), so this standalone script — which
    // runs in its own scope with no access to that `cfg` variable —
    // still follows whatever key the user picked in the Hotkeys tab.
    // Falls back to F2 if nothing has been configured yet.
    function getConfiguredAutoJoinCode() {
        try {
            const raw = localStorage.getItem("_meeland_client_v4");
            if (!raw) return "F2";
            const parsed = JSON.parse(raw);
            return (parsed && parsed.hotkeys && parsed.hotkeys.autoJoin) || "F2";
        } catch (_) {
            return "F2";
        }
    }

    async function getClipboardText() {
        // Electron preload bridge
        if (
            window.meelandClient &&
            typeof window.meelandClient.getClipboardText === "function"
        ) {
            try {
                const result =
                    await window.meelandClient.getClipboardText();

                if (typeof result === "string") {
                    return result;
                }
            } catch (error) {
                console.warn(
                    "[AutoJoin] Electron clipboard failed:",
                    error
                );
            }
        }

        // Browser fallback
        try {
            const result =
                await navigator.clipboard.readText();

            if (typeof result === "string") {
                return result;
            }
        } catch (error) {
            console.warn(
                "[AutoJoin] Browser clipboard failed:",
                error
            );
        }

        return "";
    }


    async function joinFromClipboard() {
        try {
            console.log(
                "[AutoJoin] Reading clipboard..."
            );

            const clipboardText =
                await getClipboardText();

            console.log(
                "[AutoJoin] Clipboard:",
                clipboardText
            );

            if (
                typeof clipboardText !== "string" ||
                !clipboardText.trim()
            ) {
                console.log(
                    "[AutoJoin] Clipboard is empty."
                );

                return;
            }

            const text =
                clipboardText.trim();

            let url;

            try {
                url =
                    new URL(text);

            } catch {
                console.log(
                    "[AutoJoin] Clipboard is not a valid URL."
                );

                return;
            }


            const hostname =
                url.hostname.toLowerCase();


            const isMeeland =
                hostname === "meeland.io" ||
                hostname === "www.meeland.io";


            const isCrazyGames =
                hostname === "crazygames.com" ||
                hostname === "www.crazygames.com";


            if (
                !isMeeland &&
                !isCrazyGames
            ) {
                console.log(
                    "[AutoJoin] Not a Meeland/CrazyGames link."
                );

                return;
            }


            if (
                isCrazyGames &&
                !url.pathname.startsWith(
                    "/game/meeland-io"
                )
            ) {
                console.log(
                    "[AutoJoin] Not a Meeland CrazyGames link."
                );

                return;
            }


            const roomId =
                url.searchParams.get(
                    "roomId"
                );


            const roomName =
                url.searchParams.get(
                    "roomName"
                );


            if (!roomId) {
                console.log(
                    "[AutoJoin] No roomId found."
                );

                return;
            }


            const joinUrl =
                new URL(
                    "https://meeland.io/"
                );


            joinUrl.searchParams.set(
                "roomId",
                roomId
            );


            if (roomName) {
                joinUrl.searchParams.set(
                    "roomName",
                    roomName
                );
            }


            console.log(
                "[AutoJoin] Joining:",
                joinUrl.href
            );


            window.location.href =
                joinUrl.href;

        } catch (error) {
            console.error(
                "[AutoJoin] Failed:",
                error
            );
        }
    }


    window.addEventListener(
        "keydown",
        (event) => {

            if (
                event.code !== getConfiguredAutoJoinCode()
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            console.log(
                "[AutoJoin] Key pressed."
            );

            joinFromClipboard();
        },
        true
    );

})();