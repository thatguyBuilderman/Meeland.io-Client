const {
    app,
    BrowserWindow,
    ipcMain,
    clipboard,
    session
} = require("electron");

const path = require("path");
const fs = require("fs");
const http = require("http");

const RPC = require("discord-rpc");
const { autoUpdater } = require("electron-updater");



// ====================================================
// USER AGENT: DO NOT SPOOF
//
// Leave Electron's default user agent alone. Spoofing a "normal
// Chrome" UA made Google serve its newer, stricter sign-in flow
// (passkey prompt + "this browser or app may not be secure").
// With the default UA, Google serves the older sign-in page and
// login works inside the client.
// ====================================================


// ====================================================
// COOKIE IMPORT (LOGIN FALLBACK)
//
// Google's "This browser or app may not be secure" block survives
// UA spoofing, so sign-in can't reliably complete inside the
// Electron window itself. Fallback: the user signs into meeland.io
// normally in their real browser, copies the "Cookie" request
// header for a meeland.io request (DevTools > Network tab > any
// meeland.io request > Request Headers > Cookie), and pastes it
// into a small local import window. We just upsert those cookies
// into session.defaultSession — nothing else is touched.
//
// Purely additive and 100% user-initiated (opened with
// Ctrl+Shift+L, never automatically):
//   - Already-logged-in users are unaffected. Nothing here runs
//     on startup, and cookies.set() only upserts the names the
//     user pastes — it doesn't clear or touch any other cookie,
//     so an existing valid session is left exactly as-is unless
//     someone deliberately opens this window and pastes new values.
//   - autoUpdater is untouched. It talks to the update feed over
//     its own HTTPS client, not through session.defaultSession or
//     any webContents, so nothing added here is on that path.
// ====================================================

let cookieImportWindow = null;

function parseCookieHeaderString(
    raw
) {

    return raw
        .split(";")
        .map(
            pair => pair.trim()
        )
        .filter(
            Boolean
        )
        .map(
            pair => {

                const separatorIndex =
                    pair.indexOf("=");

                if (
                    separatorIndex === -1
                ) {

                    return null;

                }

                return {
                    name:
                        pair
                            .slice(0, separatorIndex)
                            .trim(),

                    value:
                        pair
                            .slice(separatorIndex + 1)
                            .trim()
                };

            }
        )
        .filter(
            Boolean
        );

}

async function importCookiesFromHeader(
    rawCookieString
) {

    const pairs =
        parseCookieHeaderString(
            rawCookieString || ""
        );

    if (
        pairs.length === 0
    ) {

        return {
            success: false,
            error: "No valid cookies found in the pasted text."
        };

    }


    const results = [];

    for (
        const { name, value } of pairs
    ) {

        try {

            await session.defaultSession.cookies.set({
                url: "https://meeland.io",
                domain: ".meeland.io",
                path: "/",
                name,
                value,
                secure: true,
                sameSite: "no_restriction",

                // A pasted Cookie header has no expiry, which would make
                // these session cookies that Electron drops on quit.
                // Give them a real expiry so the login survives restarts.
                expirationDate:
                    Math.floor(Date.now() / 1000) +
                    60 * 60 * 24 * 30
            });

            results.push({
                name,
                ok: true
            });

        } catch (error) {

            results.push({
                name,
                ok: false,
                error: error.message
            });

        }

    }


    const failed =
        results.filter(
            result => !result.ok
        );

    return {
        success: failed.length === 0,
        imported: results.length - failed.length,
        total: results.length,
        failed
    };

}

function openCookieImportWindow() {

    if (
        cookieImportWindow &&
        !cookieImportWindow.isDestroyed()
    ) {

        cookieImportWindow.focus();

        return;

    }


    cookieImportWindow =
        new BrowserWindow({

            title:
                "Import Login",

            width:
                560,

            height:
                560,

            resizable:
                false,

            minimizable:
                false,

            maximizable:
                false,

            parent:
                mainWindow || undefined,

            modal:
                Boolean(mainWindow),

            icon:
                path.join(
                    __dirname,
                    "assets",
                    "MeelandNew.ico"
                ),

            webPreferences: {

                contextIsolation:
                    true,

                nodeIntegration:
                    false,

                preload:
                    path.join(
                        __dirname,
                        "windows",
                        "cookie-import-preload.js"
                    )

            }

        });

    cookieImportWindow.setMenuBarVisibility(
        false
    );

    cookieImportWindow.loadFile(
        path.join(
            __dirname,
            "windows",
            "cookie-import.html"
        )
    );

    cookieImportWindow.on(
        "closed",
        () => {

            cookieImportWindow =
                null;

        }
    );

}

ipcMain.handle(
    "import-meeland-cookies",
    async (event, rawCookieString) => {

        // Only the import window itself may call this. Blocks any
        // other window / injected script from overwriting cookies.
        if (
            !cookieImportWindow ||
            cookieImportWindow.isDestroyed() ||
            event.sender !== cookieImportWindow.webContents ||
            typeof rawCookieString !== "string" ||
            rawCookieString.length > 20000
        ) {

            return {
                success: false,
                error: "Invalid request."
            };

        }

        const outcome =
            await importCookiesFromHeader(
                rawCookieString
            );

        if (
            outcome.success
        ) {

            if (
                mainWindow &&
                !mainWindow.isDestroyed()
            ) {

                mainWindow.webContents.reload();

            }

            // Give the user a moment to read the success message.
            setTimeout(
                () => {

                    if (
                        cookieImportWindow &&
                        !cookieImportWindow.isDestroyed()
                    ) {

                        cookieImportWindow.close();

                    }

                },
                1200
            );

        }

        return outcome;

    }
);


// ====================================================
// DISABLE BACKGROUND THROTTLING
//
// backgroundThrottling: false on the BrowserWindow (set below)
// covers most of it, but these two switches close the remaining
// gaps in some Chromium versions — rAF pacing and timer clamping
// that can still kick in for an unfocused/occluded window. Must
// be set before app.whenReady() to take effect.
// ====================================================

app.commandLine.appendSwitch(
    "disable-renderer-backgrounding"
);

app.commandLine.appendSwitch(
    "disable-background-timer-throttling"
);

app.commandLine.appendSwitch(
    "disable-backgrounding-occluded-windows"
);


// ====================================================
// PATHS
// ====================================================

function getUserscriptsPath() {

    if (app.isPackaged) {

        return path.join(
            path.dirname(app.getPath("exe")),
            "data",
            "cache",
            ".ms"
        );

    }

    return path.join(
        __dirname,
        "data",
        "cache",
        ".ms"
    );

}


function getResourceSwapPath() {

    if (app.isPackaged) {

        return path.join(
            path.dirname(app.getPath("exe")),
            "data",
            "resource-swap"
        );

    }

    return path.join(
        __dirname,
        "data",
        "resource-swap"
    );

}

// Local copy of the official Meeland game script.
// Expected location:
// data/stack/__game-scripts.js
function getStackGameScriptPath() {

    if (app.isPackaged) {

        return path.join(
            path.dirname(app.getPath("exe")),
            "data",
            "stack",
            "__game-scripts.js"
        );

    }

    return path.join(
        __dirname,
        "data",
        "stack",
        "__game-scripts.js"
    );

}

function resolveLocalStackGameScript(rawUrl) {

    let parsed;

    try {
        parsed = new URL(rawUrl);
    } catch {
        return null;
    }

    if (
        !RESOURCE_SWAP_HOSTS.includes(parsed.hostname) ||
        parsed.pathname !== "/__game-scripts.js"
    ) {
        return null;
    }

    if (parsed.searchParams.get("v") !== "2.1") {
        return null;
    }

    const localPath = getStackGameScriptPath();

    try {
        return fs.existsSync(localPath) &&
               fs.statSync(localPath).isFile()
            ? localPath
            : null;
    } catch {
        return null;
    }

}

// ====================================================
// RESOURCE SWAPPER
//
// Purely cosmetic, local-only asset overrides. If a file exists
// under the resource-swap folder at the same path the game's
// asset URL uses (e.g. files/assets/304614511/1/Sound.mp3), that
// local file is loaded instead of the one from meeland.io. Query
// strings (?t=...&v=...) are ignored since they're cache-busting
// only. Nothing here touches game logic or network messages sent
// to the server — it only changes what this client loads locally.
// ====================================================

const RESOURCE_SWAP_HOSTS = [
    "meeland.io",
    "www.meeland.io"
];

const RESOURCE_SWAP_PREFIX = "/files/assets/";

const resourceSwapCache = new Map();


function ensureResourceSwapFolder() {

    const folder =
        getResourceSwapPath();

    try {

        if (
            !fs.existsSync(
                folder
            )
        ) {

            fs.mkdirSync(
                folder,
                {
                    recursive: true
                }
            );

            console.log(
                "[ResourceSwap] Created:",
                folder
            );

        }

        return folder;

    } catch (error) {

        console.error(
            "[ResourceSwap] Folder error:",
            error.message
        );

        return null;

    }

}


function scanResourceSwapFolder() {

    const root =
        getResourceSwapPath();

    const found = [];


    function walk(dir) {

        if (
            !fs.existsSync(dir)
        ) {

            return;

        }

        for (
            const entry of
                fs.readdirSync(
                    dir,
                    { withFileTypes: true }
                )
        ) {

            const full =
                path.join(
                    dir,
                    entry.name
                );

            if (
                entry.isDirectory()
            ) {

                walk(full);

            } else {

                found.push(full);

            }

        }

    }

    walk(root);


    if (found.length === 0) {

        console.log(
            "[ResourceSwap] No override files found in",
            root
        );

    } else {

        console.log(
            `[ResourceSwap] Found ${found.length} override file(s):`
        );

        for (const file of found) {

            console.log(
                "  -",
                path.relative(
                    root,
                    file
                )
            );

        }

    }

    return found;

}


function resolveLocalAssetByPathname(pathname) {

    if (
        !pathname.startsWith(
            RESOURCE_SWAP_PREFIX
        )
    ) {

        return null;

    }

    if (
        resourceSwapCache.has(
            pathname
        )
    ) {

        return resourceSwapCache.get(
            pathname
        );

    }

    const root =
        getResourceSwapPath();

    const candidate =
        path.normalize(
            path.join(
                root,
                pathname
            )
        );

    // Prevent path traversal - resolved path must stay inside root.
    if (
        !candidate.startsWith(
            path.normalize(root)
        )
    ) {

        resourceSwapCache.set(
            pathname,
            null
        );

        return null;

    }

    const exists =
        fs.existsSync(candidate) &&
        fs.statSync(candidate).isFile();

    const result =
        exists ? candidate : null;

    resourceSwapCache.set(
        pathname,
        result
    );

    return result;

}


function resolveLocalAsset(rawUrl) {

    let parsed;

    try {

        parsed = new URL(rawUrl);

    } catch {

        return null;

    }

    if (
        !RESOURCE_SWAP_HOSTS.includes(
            parsed.hostname
        )
    ) {

        return null;

    }

    return resolveLocalAssetByPathname(
        parsed.pathname
    );

}


// ====================================================
// RESOURCE SWAP LOCAL SERVER
//
// webRequest can't redirect an https:// request straight to a
// file:// URL — Chromium blocks that cross-scheme redirect as
// unsafe (ERR_UNSAFE_REDIRECT), even though the file is only
// ever read locally. The fix is to serve the swap folder over
// a tiny HTTP server bound to 127.0.0.1 and redirect matched
// requests there instead — an http(s)-to-http redirect is fine.
// ====================================================

const RESOURCE_SWAP_CONTENT_TYPES = {

    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".json": "application/json"

};


const STACK_GAME_SCRIPT_CONTENT_TYPE = "application/javascript";


let resourceSwapServerPort = null;


function startResourceSwapServer() {

    return new Promise(resolve => {

        const server =
            http.createServer(
                (req, res) => {

                    try {

                        const pathname =
                            req.url.split("?")[0];

                        // Serve the locally patched game script.
                        if (
                            pathname === "/__game-scripts.js"
                        ) {
                            const localGameScript =
                                getStackGameScriptPath();

                            if (
                                !fs.existsSync(localGameScript) ||
                                !fs.statSync(localGameScript).isFile()
                            ) {
                                res.writeHead(404);
                                res.end();
                                return;
                            }

                            res.writeHead(
                                200,
                                {
                                    "Content-Type":
                                        STACK_GAME_SCRIPT_CONTENT_TYPE,
                                    "Access-Control-Allow-Origin": "*",
                                    "Cache-Control": "no-store"
                                }
                            );

                            fs.createReadStream(localGameScript)
                                .pipe(res);

                            return;
                        }


                        const localPath =
                            resolveLocalAssetByPathname(
                                pathname
                            );

                        if (!localPath) {

                            res.writeHead(404);

                            res.end();

                            return;

                        }

                        const ext =
                            path.extname(
                                localPath
                            ).toLowerCase();

                        const contentType =
                            RESOURCE_SWAP_CONTENT_TYPES[ext] ||
                            "application/octet-stream";

                        res.writeHead(
                            200,
                            {
                                "Content-Type": contentType,
                                "Access-Control-Allow-Origin": "*",
                                "Cache-Control": "no-store"
                            }
                        );

                        fs.createReadStream(localPath)
                            .pipe(res);

                    } catch (error) {

                        console.error(
                            "[ResourceSwap] Server error:",
                            error.message
                        );

                        res.writeHead(500);

                        res.end();

                    }

                }
            );

        server.listen(
            0,
            "127.0.0.1",
            () => {

                resourceSwapServerPort =
                    server.address().port;

                console.log(
                    "[ResourceSwap] Local server on 127.0.0.1:" +
                        resourceSwapServerPort
                );

                resolve();

            }
        );

    });

}


// ====================================================
// WEB REQUEST INTERCEPTION
//
// Electron only allows one onBeforeRequest listener per session,
// so background-blocking and resource swapping are handled together
// here rather than as two separate onBeforeRequest registrations.
//
// Must be called after app.whenReady() — session.defaultSession
// isn't guaranteed to exist before then. Registered before
// createWindow()/loadURL() so it's active for the very first
// request the page makes.
// ====================================================

function setupWebRequestInterception() {



    session.defaultSession.webRequest.onBeforeRequest(
        (details, callback) => {

            try {

                if (
                    details.url.startsWith(
                        "https://cdn.meeland.io/background.webp"
                    )
                ) {

                    console.log(
                        "[Background] Blocked:",
                        details.url
                    );

                    callback({
                        cancel: true
                    });

                    return;

                }


                const localGameScript =
                    resolveLocalStackGameScript(
                        details.url
                    );

                if (
                    localGameScript &&
                    resourceSwapServerPort
                ) {
                    const swappedGameScriptUrl =
                        "http://127.0.0.1:" +
                        resourceSwapServerPort +
                        "/__game-scripts.js";

                    console.log(
                        "[GameScript] Swapping:",
                        details.url,
                        "->",
                        localGameScript
                    );

                    callback({
                        redirectURL:
                            swappedGameScriptUrl
                    });

                    return;
                }


                const localAsset =
                    resolveLocalAsset(
                        details.url
                    );

                if (
                    localAsset &&
                    resourceSwapServerPort
                ) {

                    const swappedUrl =
                        "http://127.0.0.1:" +
                        resourceSwapServerPort +
                        new URL(details.url).pathname;

                    console.log(
                        "[ResourceSwap] Swapping:",
                        details.url,
                        "->",
                        localAsset
                    );

                    callback({
                        redirectURL: swappedUrl
                    });

                    return;

                }


                callback({});

            } catch (error) {

                console.error(
                    "[WebRequest] Failed:",
                    error.message
                );

                callback({
                    cancel: false
                });

            }

        }
    );

}


// ====================================================
// CLIPBOARD
// ====================================================

ipcMain.handle(
    "get-clipboard-text",
    () => {

        try {

            return clipboard.readText();

        } catch (error) {

            console.error(
                "[Clipboard] Failed:",
                error.message
            );

            return "";

        }

    }
);

// ====================================================
// USERSCRIPT ASSETS
//
// Any image dropped in the .ms folder gets converted
// to Base64 and exposed to userscripts through:
//
// window.__MEELAND_ASSETS__["filename.png"]
// ====================================================

const ASSET_MIME_TYPES = {

    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm"

};


function getUserscriptAssets() {

    const folder =
        getUserscriptsPath();

    const assets = {};

    let files;


    try {

        files =
            fs.readdirSync(folder);

    } catch (error) {

        console.error(
            "[Assets] Read error:",
            error.message
        );

        return assets;

    }


    for (const file of files) {

        const ext =
            path.extname(file)
                .toLowerCase();

        const mime =
            ASSET_MIME_TYPES[ext];


        if (!mime) {
            continue;
        }


        try {

            const buffer =
                fs.readFileSync(
                    path.join(
                        folder,
                        file
                    )
                );


            assets[file] =
                "data:" +
                mime +
                ";base64," +
                buffer.toString(
                    "base64"
                );


            console.log(
                "[Assets] Loaded:",
                file,
                "(" +
                    buffer.length +
                    " bytes)"
            );


        } catch (error) {

            console.error(
                "[Assets] Failed to load",
                file + ":",
                error.message
            );

        }

    }


    return assets;

}


// ====================================================
// DISCORD RPC
// ====================================================

const DISCORD_CLIENT_ID =
    "1538464617913909348";


let rpc = null;
let rpcConnected = false;

let sessionStartTime = null;
let lastGameMode = null;
let gameModeTimer = null;


const GAME_NAMES = {

    EscapeTsunami:
        "Escape Waves",

    PetTycoon:
        "Steal a Pet",

    TowerParkour:
        "Obby Tower",

    Infection:
        "Murder Mystery",

    SwordRNG:
        "Pets RNG",

    SwordRng:
        "Pets RNG",

    "Sword RNG":
        "Pets RNG"

};


// ====================================================
// WINDOW
// ====================================================

let mainWindow = null;


// ====================================================
// HIDE .MS FOLDER
// ====================================================

function hideUserscriptsFolder(
    folderPath
) {

    if (
        process.platform !==
        "win32"
    ) {

        return;

    }


    try {

        const {
            execFile
        } = require(
            "child_process"
        );


        execFile(
            "attrib",
            [
                "+h",
                folderPath
            ],
            error => {

                if (error) {

                    console.log(
                        "[Userscripts] Could not hide folder:",
                        error.message
                    );

                }

            }
        );


    } catch (error) {

        console.log(
            "[Userscripts] Hide error:",
            error.message
        );

    }

}


// ====================================================
// CREATE .MS FOLDER
// ====================================================

function ensureUserscriptsFolder() {

    const folder =
        getUserscriptsPath();


    try {

        if (
            !fs.existsSync(
                folder
            )
        ) {

            fs.mkdirSync(
                folder,
                {
                    recursive: true
                }
            );


            console.log(
                "[Userscripts] Created:",
                folder
            );

        }


        hideUserscriptsFolder(
            folder
        );


        return folder;


    } catch (error) {

        console.error(
            "[Userscripts] Folder error:",
            error.message
        );

        return null;

    }

}


// ====================================================
// LOAD USERSCRIPTS
// ====================================================

async function loadUserscripts() {

    if (
        !mainWindow ||
        mainWindow.isDestroyed()
    ) {

        return;

    }


    const folder =
        ensureUserscriptsFolder();


    if (!folder) {
        return;
    }


    let files;


    try {

        files =
            fs.readdirSync(
                folder
            );

    } catch (error) {

        console.error(
            "[Userscripts] Read error:",
            error.message
        );

        return;

    }


    const scripts =
        files
            .filter(
                file =>
                    file
                        .toLowerCase()
                        .endsWith(".js")
            )
            .sort();


    console.log(
        `[Userscripts] Found ${scripts.length} script(s).`
    );


    // ====================================================
    // LOAD ASSETS
    // ====================================================

    const assets =
        getUserscriptAssets();


    console.log(
        "[Assets DEBUG] Loaded",
        Object.keys(assets).length,
        "asset(s)"
    );


    // ====================================================
    // LOAD SCRIPTS
    // ====================================================

    for (
        const file of scripts
    ) {

        const filePath =
            path.join(
                folder,
                file
            );


        try {

            const script =
                fs.readFileSync(
                    filePath,
                    "utf8"
                );


            if (
                !script.trim()
            ) {

                continue;

            }


            console.log(
                `[Userscripts] Loading: ${file}`
            );


            const safeScript =
                JSON.stringify(
                    script
                );


            const safeAssets =
                JSON.stringify(
                    assets
                );


            const injection = `

                (() => {

                    try {

                        // ====================================
                        // LOCAL USERSCRIPT ASSETS
                        // ====================================

                        window.__MEELAND_ASSETS__ =
                            ${safeAssets};


                        console.log(
                            "[Meeland Client] Assets injected:",
                            Object.keys(
                                window.__MEELAND_ASSETS__
                            )
                        );


                        // ====================================
                        // EXECUTE USERSCRIPT
                        // ====================================

                        const code =
                            ${safeScript};


                        (0, eval)(code);


                    } catch (error) {

                        console.error(
                            "[Userscript] ${file} failed:",
                            error
                        );

                    }

                })();

            `;


            await mainWindow
                .webContents
                .executeJavaScript(
                    injection,
                    true
                );


            console.log(
                `[Userscripts] Loaded: ${file}`
            );


        } catch (error) {

            console.error(
                `[Userscripts] Failed to load ${file}:`,
                error.message
            );

        }

    }

}


// ====================================================
// FPS COUNTER
// ====================================================

function addFPSCounter() {

    if (
        !mainWindow ||
        mainWindow.isDestroyed()
    ) {

        return;

    }


    mainWindow.webContents
        .executeJavaScript(`

            (() => {

                const old =
                    document.getElementById(
                        "meeland-fps-counter"
                    );


                if (old) {

                    old.remove();

                }


                const fps =
                    document.createElement(
                        "div"
                    );


                fps.id =
                    "meeland-fps-counter";


                fps.textContent =
                    "FPS: --";


                fps.style.position =
                    "fixed";


                fps.style.left =
                    "10px";


                fps.style.bottom =
                    "10px";


                fps.style.color =
                    "white";


                fps.style.background =
                    "rgba(0,0,0,0.65)";


                fps.style.padding =
                    "4px 7px";


                fps.style.font =
                    "14px Arial";


                fps.style.zIndex =
                    "999999";


                fps.style.pointerEvents =
                    "none";


                fps.style.borderRadius =
                    "4px";


                document.body.appendChild(
                    fps
                );


                let frames = 0;


                let last =
                    performance.now();


                function loop() {

                    frames++;


                    const now =
                        performance.now();


                    if (
                        now - last >=
                        1000
                    ) {

                        fps.textContent =
                            "FPS: " +
                            frames;


                        frames = 0;


                        last = now;

                    }


                    requestAnimationFrame(
                        loop
                    );

                }


                loop();

            })();

        `)
        .catch(
            error => {

                console.error(
                    "[FPS] Error:",
                    error.message
                );

            }
        );

}


// ====================================================
// DISCORD PRESENCE
// ====================================================

function updatePresence(
    gameMode
) {

    if (
        !rpcConnected ||
        !rpc ||
        !sessionStartTime
    ) {

        return;

    }


    if (
        gameMode ===
        lastGameMode
    ) {

        return;

    }


    lastGameMode =
        gameMode;


    let state;


    if (
        !gameMode ||
        gameMode === "Hub"
    ) {

        state =
            "Exploring Meeland Hub";

    } else {

        const name =
            GAME_NAMES[
                gameMode
            ] ||
            gameMode;


        state =
            `Playing ${name}`;

    }


    console.log(
        "[RPC] Game mode:",
        gameMode
    );


    rpc.setActivity({

        details:
            "Playing Meeland.io",

        state:
            state,

        startTimestamp:
            sessionStartTime,

        largeImageKey:
            "meeland",

        largeImageText:
            "Meeland.io",

        instance:
            false

    }).catch(
        error => {

            console.error(
                "[RPC] Update failed:",
                error.message
            );

        }
    );

}


// ====================================================
// DETECT GAME MODE
// ====================================================

async function detectGameMode() {

    if (
        !mainWindow ||
        mainWindow.isDestroyed()
    ) {

        return;

    }


    try {

        const gameMode =
            await mainWindow
                .webContents
                .executeJavaScript(`

                    (() => {

                        try {

                            // =================================
                            // GAME GLOBALS
                            // =================================

                            if (
                                typeof GameGlobals !==
                                "undefined" &&
                                GameGlobals &&
                                GameGlobals.gameMode
                            ) {

                                return String(
                                    GameGlobals.gameMode
                                );

                            }


                            // =================================
                            // WINDOW GAME GLOBALS
                            // =================================

                            if (
                                window.GameGlobals &&
                                window.GameGlobals.gameMode
                            ) {

                                return String(
                                    window.GameGlobals.gameMode
                                );

                            }


                            // =================================
                            // PLAYCANVAS
                            // =================================

                            if (
                                window.pc &&
                                window.pc.app &&
                                window.pc.app.root
                            ) {

                                const networkManager =
                                    window.pc.app.root
                                        .findByName(
                                            "NetworkManager"
                                        );


                                if (
                                    networkManager &&
                                    networkManager.script &&
                                    networkManager.script.networkManager &&
                                    networkManager.script.networkManager.gameMode
                                ) {

                                    return String(
                                        networkManager
                                            .script
                                            .networkManager
                                            .gameMode
                                    );

                                }

                            }


                            return "Hub";


                        } catch {

                            return "Hub";

                        }

                    })();

                `);


        if (
            typeof gameMode ===
            "string"
        ) {

            updatePresence(
                gameMode.trim()
            );

        }


    } catch {

        // Game state unavailable.

    }

}


// ====================================================
// START GAME MODE DETECTION
// ====================================================

function startGameModeDetection() {

    if (
        gameModeTimer
    ) {

        clearInterval(
            gameModeTimer
        );

    }


    detectGameMode();


    gameModeTimer =
        setInterval(
            detectGameMode,
            2000
        );

}


// ====================================================
// START DISCORD RPC
// ====================================================

function startDiscordRPC() {

    console.log(
        "[RPC] Starting Discord RPC..."
    );


    rpc =
        new RPC.Client({
            transport: "ipc"
        });


    rpc.on(
        "ready",
        () => {

            rpcConnected =
                true;


            sessionStartTime =
                Date.now();


            console.log(
                "[RPC] Discord RPC connected!"
            );


            rpc.setActivity({

                details:
                    "Playing Meeland.io",

                state:
                    "Exploring Meeland Hub",

                startTimestamp:
                    sessionStartTime,

                largeImageKey:
                    "meeland",

                largeImageText:
                    "Meeland.io",

                instance:
                    false

            }).catch(
                error => {

                    console.error(
                        "[RPC] Initial presence failed:",
                        error.message
                    );

                }
            );


            startGameModeDetection();

        }
    );


    rpc.on(
        "disconnected",
        () => {

            rpcConnected =
                false;


            console.log(
                "[RPC] Discord disconnected."
            );

        }
    );


    rpc.login({

        clientId:
            DISCORD_CLIENT_ID

    }).catch(
        error => {

            rpcConnected =
                false;


            console.error(
                "[RPC] Login failed:",
                error
            );

        }
    );

}


// ====================================================
// AUTO UPDATER
// ====================================================

function startAutoUpdater() {

    if (
        !app.isPackaged
    ) {

        console.log(
            "[Updater] Skipped in development mode."
        );

        return;

    }


    autoUpdater.autoDownload =
        true;


    autoUpdater.autoInstallOnAppQuit =
        true;


    setTimeout(
        () => {

            autoUpdater
                .checkForUpdatesAndNotify()
                .catch(
                    error => {

                        console.error(
                            "[Updater] Failed:",
                            error.message
                        );

                    }
                );

        },
        5000
    );

}


// ====================================================
// CREATE WINDOW
// ====================================================

function createWindow() {

    mainWindow =
        new BrowserWindow({

            title:
                "Meeland.io Client",

            width:
                1280,

            height:
                720,

            minWidth:
                900,

            minHeight:
                600,

            fullscreen:
                true,

            icon:
                path.join(
                    __dirname,
                    "assets",
                    "MeelandNew.ico"
                ),

            webPreferences: {

                contextIsolation:
                    true,

                nodeIntegration:
                    false,

                // Chromium throttles setInterval/setTimeout, rAF, and
                // general renderer work in windows that are unfocused,
                // minimized, or covered by another window — the same
                // mechanism a normal browser uses for background tabs.
                // Without this flag, grinding/farming logic stalls the
                // moment the user alt-tabs away or the window loses focus.
                backgroundThrottling:
                    false,

                preload:
                    path.join(
                        __dirname,
                        "preload.js"
                    )

            }

        });


    // ====================================================
    // KEEP CUSTOM TITLE
    // ====================================================

    mainWindow.on(
        "page-title-updated",
        event => {

            event.preventDefault();

        }
    );


    // ====================================================
    // LOAD MEELAND
    // ====================================================


    // Ctrl+Shift+L (Cmd+Shift+L on Mac) opens the login import
    // window. Scoped to this window, so it only fires while the
    // client is focused and never hijacks the key system-wide.
    mainWindow.webContents.on(
        "before-input-event",
        (event, input) => {

            if (
                input.type === "keyDown" &&
                input.shift &&
                (input.control || input.meta) &&
                input.key.toLowerCase() === "l"
            ) {

                event.preventDefault();

                openCookieImportWindow();

            }

        }
    );


    mainWindow.loadURL(
        "https://meeland.io"
    );


    // ====================================================
    // PAGE LOADED
    // ====================================================

    mainWindow.webContents.on(
        "did-finish-load",
        () => {

            console.log(
                "[Meeland] Page finished loading."
            );


            setTimeout(
                async () => {

                    if (
                        !mainWindow ||
                        mainWindow.isDestroyed()
                    ) {

                        return;

                    }


                    // ========================================
                    // FPS COUNTER
                    // ========================================

                    addFPSCounter();


                    // ========================================
                    // USERSCRIPTS
                    // ========================================

                    await loadUserscripts();

                },
                1000
            );

        }
    );


    // ====================================================
    // CLOSED
    // ====================================================

    mainWindow.on(
        "closed",
        () => {

            mainWindow =
                null;


            if (
                gameModeTimer
            ) {

                clearInterval(
                    gameModeTimer
                );


                gameModeTimer =
                    null;

            }

        }
    );

}


// ====================================================
// APP START
// ====================================================

app.whenReady().then(
    async () => {

        console.log(
            "[Meeland] Starting client..."
        );


        // ================================================
        // CREATE .MS FOLDER
        // ================================================

        ensureUserscriptsFolder();


        // ================================================
        // RESOURCE SWAPPER SETUP
        //
        // Server must be listening before we register the
        // redirect logic, otherwise the first matched request
        // would redirect to a port that isn't open yet.
        // ================================================

        ensureResourceSwapFolder();

        scanResourceSwapFolder();

        await startResourceSwapServer();

        const localGameScript =
            getStackGameScriptPath();

        console.log(
            fs.existsSync(localGameScript)
                ? "[GameScript] Local patched script found: " + localGameScript
                : "[GameScript] WARNING: Local patched script NOT found: " + localGameScript
        );


        // ================================================
        // WEB REQUEST INTERCEPTION
        // (background block + resource swap, combined)
        // ================================================

        setupWebRequestInterception();


        // ================================================
        // CREATE WINDOW
        // ================================================

        createWindow();


        // ================================================
        // DISCORD RPC
        // ================================================

        startDiscordRPC();


        // ================================================
        // AUTO UPDATER
        // ================================================

        startAutoUpdater();


        // ================================================
        // ACTIVATE
        // ================================================

        app.on(
            "activate",
            () => {

                if (
                    BrowserWindow
                        .getAllWindows()
                        .length === 0
                ) {

                    createWindow();

                }

            }
        );

    }
);


// ====================================================
// CLEANUP
// ====================================================

app.on(
    "before-quit",
    () => {

        // ================================================
        // STOP GAME MODE DETECTION
        // ================================================

        if (
            gameModeTimer
        ) {

            clearInterval(
                gameModeTimer
            );


            gameModeTimer =
                null;

        }


        // ================================================
        // DISCORD RPC CLEANUP
        // ================================================

        if (rpc) {

            try {

                rpc.clearActivity();

                rpc.destroy();

            } catch {

                // Discord may already be closed.

            }

        }

    }
);


// ====================================================
// ALL WINDOWS CLOSED
// ====================================================

app.on(
    "window-all-closed",
    () => {

        if (
            process.platform !==
            "darwin"
        ) {

            app.quit();

        }

    }
);