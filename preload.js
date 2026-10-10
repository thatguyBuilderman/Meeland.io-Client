const {
    contextBridge,
    ipcRenderer
} = require("electron");


console.log(
    "Meeland Client preload loaded."
);

contextBridge.exposeInMainWorld(
    "meelandClient",
    {
        getClipboardText: () => {
            return ipcRenderer.invoke(
                "get-clipboard-text"
            );
        },

        getBackgroundVideoUrl: () => {
            return ipcRenderer.invoke(
                "get-background-video-url"
            );
        }
    }
);