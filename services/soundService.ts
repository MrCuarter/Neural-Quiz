
// Simple Sound Manager using reliable, short UI sound effects
// Replaced long fanfares with short UI blips to improve UX and avoid annoyance.
const SOUNDS = {
    // Short tick for interactions
    click: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_73d420543a.mp3?filename=notification-sound-7062.mp3', 
    // Positive short chime
    correct: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3?filename=success-1-6297.mp3', 
    // Quick buzzer
    wrong: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=negative-beeps-6008.mp3', 
    // Mechanical click for spinning
    spin: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_8db1f115a3.mp3?filename=click-21156.mp3', 
    // Short item discovery sound
    win_item: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_5b82093557.mp3?filename=collect-ring-15982.mp3', 
    // Alert sound
    event: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_c8c8a73467.mp3?filename=click-124467.mp3', 
    // Shield Block sound (Metallic impact)
    block: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=click-124467.mp3', // Reusing click for now or finding a metallic ping
    bg_loop: '' 
};

class SoundManager {
    private audioCache: Record<string, HTMLAudioElement> = {};
    private muted: boolean = false;

    constructor() {
        // Preload
        if (typeof window !== 'undefined') {
            Object.entries(SOUNDS).forEach(([key, url]) => {
                if (url) {
                    this.audioCache[key] = new Audio(url);
                    this.audioCache[key].volume = 0.4;
                }
            });
        }
    }

    play(key: keyof typeof SOUNDS) {
        if (this.muted || !this.audioCache[key]) return;
        
        try {
            // Clone to allow overlapping sounds
            const sound = this.audioCache[key].cloneNode() as HTMLAudioElement;
            sound.volume = 0.4;
            // Force play promise handling
            const playPromise = sound.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Auto-play was prevented
                    // console.warn("Audio play blocked", error);
                });
            }
        } catch (e) {
            console.warn("Sound error", e);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    isMuted() {
        return this.muted;
    }
}

export const soundService = new SoundManager();
