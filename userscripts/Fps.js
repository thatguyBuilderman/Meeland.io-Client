var PerformanceHud = pc.createScript('performanceHud');

// Change this if you have a real ping endpoint
PerformanceHud.attributes.add('pingUrl', {
    type: 'string',
    default: '/'
});

PerformanceHud.prototype.initialize = function () {
    // =========================
    // CREATE HUD
    // =========================

    this.hud = document.createElement('div');
    this.hud.id = 'performance-hud';

    this.hud.innerHTML = `
        <div class="perf-box">
            <div class="perf-item">
                <span class="perf-dot fps-dot"></span>
                <span class="perf-label">FPS</span>
                <span id="fps-value">60</span>
            </div>

            <div class="perf-divider"></div>

            <div class="perf-item">
                <span class="perf-dot ping-dot"></span>
                <span class="perf-label">PING</span>
                <span id="ping-value">-- ms</span>
            </div>
        </div>
    `;

    document.body.appendChild(this.hud);

    // =========================
    // STYLE
    // =========================

    this.style = document.createElement('style');

    this.style.innerHTML = `
        #performance-hud {
            position: fixed;

            /* BELOW YOUR TOP LEFT BUTTONS */
            top: 92px;
            left: 14px;

            z-index: 999999;

            font-family: Arial, Helvetica, sans-serif;

            user-select: none;
            pointer-events: none;
        }

        .perf-box {
            height: 38px;

            display: flex;
            align-items: center;

            padding: 0 13px;

            background: rgba(12, 12, 12, 0.94);

            border-radius: 15px;

            border: 2px solid rgba(255, 255, 255, 0.12);

            box-shadow:
                0 3px 0 rgba(0, 0, 0, 0.45),
                0 4px 10px rgba(0, 0, 0, 0.2);

            color: white;

            font-size: 13px;
            font-weight: 800;
        }

        .perf-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .perf-label {
            font-size: 10px;
            opacity: 0.65;
        }

        #fps-value,
        #ping-value {
            min-width: 24px;
            text-align: left;
        }

        .perf-dot {
            width: 8px;
            height: 8px;

            border-radius: 50%;

            background: #35e56f;

            box-shadow: 0 0 5px currentColor;
        }

        .perf-divider {
            width: 2px;
            height: 18px;

            margin: 0 10px;

            background: rgba(255, 255, 255, 0.16);

            border-radius: 2px;
        }

        @media (max-width: 700px) {
            #performance-hud {
                top: 86px;
                left: 10px;
            }

            .perf-box {
                height: 34px;
                padding: 0 10px;
                font-size: 12px;
            }
        }
    `;

    document.head.appendChild(this.style);


    // =========================
    // FPS VARIABLES
    // =========================

    this.frames = 0;
    this.fps = 60;
    this.fpsTimer = 0;

    this.fpsElement = document.getElementById('fps-value');
    this.pingElement = document.getElementById('ping-value');

    this.fpsDot = this.hud.querySelector('.fps-dot');
    this.pingDot = this.hud.querySelector('.ping-dot');


    // =========================
    // PING
    // =========================

    this.measurePing();

    this.pingInterval = setInterval(() => {
        this.measurePing();
    }, 3000);


    // Remove HUD if script/entity gets destroyed
    this.on('destroy', function () {
        clearInterval(this.pingInterval);

        if (this.hud) {
            this.hud.remove();
        }

        if (this.style) {
            this.style.remove();
        }
    }, this);
};


// ===================================================
// FPS
// ===================================================

PerformanceHud.prototype.update = function (dt) {

    this.frames++;
    this.fpsTimer += dt;

    // Update around twice per second
    if (this.fpsTimer >= 0.5) {

        this.fps = Math.round(
            this.frames / this.fpsTimer
        );

        this.frames = 0;
        this.fpsTimer = 0;

        this.fpsElement.textContent = this.fps;

        // FPS colour
        if (this.fps >= 50) {

            this.fpsDot.style.background = '#35e56f';

        } else if (this.fps >= 30) {

            this.fpsDot.style.background = '#ffd43b';

        } else {

            this.fpsDot.style.background = '#ff4d4d';
        }
    }
};


// ===================================================
// PING
// ===================================================

PerformanceHud.prototype.measurePing = async function () {

    const start = performance.now();

    try {

        await fetch(
            this.pingUrl +
            (this.pingUrl.includes('?') ? '&' : '?') +
            'ping=' + Date.now(),
            {
                method: 'HEAD',
                cache: 'no-store'
            }
        );

        const ping = Math.round(
            performance.now() - start
        );

        this.pingElement.textContent = ping + ' ms';

        // Ping colour
        if (ping <= 70) {

            this.pingDot.style.background = '#35e56f';

        } else if (ping <= 150) {

            this.pingDot.style.background = '#ffd43b';

        } else {

            this.pingDot.style.background = '#ff4d4d';
        }

    } catch (error) {

        this.pingElement.textContent = '-- ms';
        this.pingDot.style.background = '#888';
    }
};