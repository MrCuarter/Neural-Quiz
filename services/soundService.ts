
// Sound Manager - SILENT MODE
// All audio logic has been removed as per request.

class SoundManager {
    constructor() {
        // No-op
    }

    play(key: string) {
        // Silent
    }

    toggleMute() {
        return true;
    }

    isMuted() {
        return true;
    }
}

export const soundService = new SoundManager();
