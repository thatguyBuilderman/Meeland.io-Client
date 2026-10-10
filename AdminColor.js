(() => {
    "use strict";

    // Meeland Admin username color
    // #BA0100 = RGB(186, 1, 0)
    const ADMIN_COLOR = new pc.Color(
        186 / 255,
        1 / 255,
        0 / 255
    );

    let lastApplyCount = -1;

    function applyAdminColor() {
        try {
            if (!window.pc || !pc.app || !pc.app.root) {
                return;
            }

            let changed = 0;
            const visited = new Set();

            function inspectObject(obj) {
                if (!obj || (typeof obj !== "object" && typeof obj !== "function")) {
                    return;
                }

                if (visited.has(obj)) {
                    return;
                }

                visited.add(obj);

                // The game OverlayManager stores the color here.
                if (Object.prototype.hasOwnProperty.call(obj, "adminColor") ||
                    "adminColor" in obj) {
                    obj.adminColor = new pc.Color(
                        ADMIN_COLOR.r,
                        ADMIN_COLOR.g,
                        ADMIN_COLOR.b
                    );
                    changed++;
                }

                // Inspect PlayCanvas script instances.
                if (obj.script) {
                    inspectObject(obj.script);

                    for (const key of Object.keys(obj.script)) {
                        try {
                            const value = obj.script[key];
                            if (value && (typeof value === "object" || typeof value === "function")) {
                                inspectObject(value);
                            }
                        } catch {}
                    }
                }

                // Inspect child entities.
                if (Array.isArray(obj.children)) {
                    for (const child of obj.children) {
                        inspectObject(child);
                    }
                }
            }

            inspectObject(pc.app.root);

            if (changed !== lastApplyCount) {
                console.log(
                    "[AdminColor] Applied #BA0100 to",
                    changed,
                    "Admin color instance(s)."
                );
                lastApplyCount = changed;
            }
        } catch (error) {
            console.warn("[AdminColor] Failed:", error);
        }
    }

    // The game can create/recreate the OverlayManager after startup,
    // so keep checking rather than relying on a single run.
    const timer = setInterval(applyAdminColor, 500);

    // Run once immediately as well.
    applyAdminColor();

    window.addEventListener("beforeunload", () => {
        clearInterval(timer);
    });

    console.log("[AdminColor] Userscript loaded — target: #BA0100");
})();