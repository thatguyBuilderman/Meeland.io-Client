// background-timer-worker.js
// A setInterval running inside a Web Worker is not subject to the
// same page-visibility-based throttling Chrome/Electron applies to
// main-thread timers. Post a message to start/stop it.

let timers = {};

self.onmessage = function (e) {
    const { action, id, delay } = e.data;

    if (action === 'start') {
        if (timers[id]) clearInterval(timers[id]);
        timers[id] = setInterval(() => {
            self.postMessage({ id, tick: true });
        }, delay);
    }

    if (action === 'stop') {
        if (timers[id]) {
            clearInterval(timers[id]);
            delete timers[id];
        }
    }
};
