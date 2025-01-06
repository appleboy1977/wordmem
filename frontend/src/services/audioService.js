const audioCache = new Map();
let audioContext = null;

class AudioService {
  static async initializeAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume the audio context if it's suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    return audioContext;
  }

  static async getAudio(url) {
    // Check cache first
    if (audioCache.has(url)) {
      return audioCache.get(url);
    }

    try {
      // Initialize context if needed
      await this.initializeAudioContext();
      
      const isExternalUrl = url.startsWith('http');
      const fetchUrl = isExternalUrl ? `/api/audio/proxy?url=${encodeURIComponent(url)}` : url;
      
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Cache the decoded audio buffer
      audioCache.set(url, {
        buffer: audioBuffer
      });
      
      return audioCache.get(url);
    } catch (error) {
      console.error('Failed to load audio:', error);
      throw error;
    }
  }

  static async playAudio(url, volume = 1.0) {
    try {
      // Initialize context if needed
      await this.initializeAudioContext();
      
      const { buffer } = await this.getAudio(url);
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = volume;
      
      source.start(0);
      return source;
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
  }

  static async preloadAudio(urls) {
    // Only preload after user interaction
    if (audioContext && audioContext.state === 'running') {
      return Promise.all(urls.map(url => this.getAudio(url)));
    }
    return Promise.resolve(); // Skip preloading if no user interaction yet
  }

  static cleanup() {
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    audioCache.clear();
  }

  static suspend() {
    if (audioContext) {
      audioContext.suspend();
    }
  }

  static resume() {
    if (audioContext) {
      audioContext.resume();
    }
  }
}

export default AudioService; 