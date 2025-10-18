// Lightweight AudioStreamer modeled after liveconversation-sample
// Plays PCM16 mono chunks via Web Audio API with scheduled buffering

export default class AudioStreamer {
  constructor(audioContext) {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.audioContext = audioContext || (AC ? new AC() : null);
    this.sampleRate = 16000; // default; can be overridden per chunk
    this.gainNode = null;
    this.scheduledTime = 0;
    this.queue = [];
    this.isInitialized = false;
    this.isStopped = true;
    this._init();
  }

  _init() {
    if (!this.audioContext) return;
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;
    this.gainNode.connect(this.audioContext.destination);
    this.scheduledTime = this.audioContext.currentTime;
    this.isInitialized = true;
    this.isStopped = false;
  }

  getContext() {
    return this.audioContext;
  }

  async resume() {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.isStopped = false;
    this.scheduledTime = Math.max(this.audioContext.currentTime, this.scheduledTime);
  }

  async stop() {
    if (!this.audioContext) return;
    try {
      this.gainNode && this.gainNode.disconnect();
    } catch {}
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;
    this.gainNode.connect(this.audioContext.destination);
    this.queue = [];
    this.scheduledTime = this.audioContext.currentTime;
    this.isStopped = true;
  }

  clear() {
    this.queue = [];
  }

  setVolume(v) {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, v));
  }

  // Add a PCM16 chunk. Accepts ArrayBuffer or Uint8Array. Optional sampleRate.
  async addPCM16(data, options = {}) {
    if (!this.audioContext) return;
    if (!data) return;

    const sampleRate = options.sampleRate || this.sampleRate || 16000;
    const volume = options.volume != null ? options.volume : undefined;
    if (volume != null) this.setVolume(volume);

    // Normalize to Int16Array
    let bytes;
    if (data instanceof ArrayBuffer) bytes = new Int16Array(data);
    else if (data.buffer) bytes = new Int16Array(data.buffer, data.byteOffset || 0, Math.floor(data.byteLength / 2));
    else return;

    // Convert PCM16 to Float32 in [-1, 1]
    const float32 = new Float32Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      float32[i] = Math.max(-1, Math.min(1, bytes[i] / 32768));
    }

    // Create audio buffer
    const audioBuffer = this.audioContext.createBuffer(1, float32.length, sampleRate);
    audioBuffer.copyToChannel(float32, 0);

    // Create source and schedule
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    const startAt = Math.max(this.scheduledTime, this.audioContext.currentTime);
    try {
      source.start(startAt);
    } catch (e) {
      // If scheduling fails (e.g., context suspended), attempt resume then start ASAP
      try { await this.resume(); source.start(this.audioContext.currentTime + 0.01); } catch {}
    }

    this.scheduledTime = startAt + audioBuffer.duration;

    source.onended = () => {
      // Free references
      try { source.disconnect(); } catch {}
    };

    this.queue.push({ buffer: audioBuffer, source, startAt });
  }

  // Convenience to decode base64 PCM string and enqueue
  async addBase64PCM16(b64, options = {}) {
    if (!b64) return;
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    await this.addPCM16(bytes, options);
  }

  // Decode base64 WAV (PCM16) and enqueue via Web Audio; downmix stereo if needed
  async addBase64WavPCM16(b64, options = {}) {
    if (!b64) return;
    const binary = atob(b64);
    const len = binary.length;
    const data = new Uint8Array(len);
    for (let i = 0; i < len; i++) data[i] = binary.charCodeAt(i);

    // Helper to read LE values
    const readU32 = (off) => (data[off] | (data[off+1] << 8) | (data[off+2] << 16) | (data[off+3] << 24)) >>> 0;
    const readU16 = (off) => (data[off] | (data[off+1] << 8)) >>> 0;

    // Validate RIFF/WAVE
    const tag = String.fromCharCode(data[0], data[1], data[2], data[3]);
    const waveTag = String.fromCharCode(data[8], data[9], data[10], data[11]);
    if (tag !== 'RIFF' || waveTag !== 'WAVE') {
      // Not a WAV file; bail
      return;
    }

    // Find 'fmt ' chunk and 'data' chunk (chunks can be out of order)
    let offset = 12;
    let fmtOffset = -1;
    let dataOffset = -1;
    let dataSize = 0;
    while (offset + 8 <= len) {
      const id = String.fromCharCode(data[offset], data[offset+1], data[offset+2], data[offset+3]);
      const size = readU32(offset + 4);
      if (id === 'fmt ') fmtOffset = offset + 8;
      else if (id === 'data') { dataOffset = offset + 8; dataSize = size; }
      offset += 8 + size + (size % 2); // chunk sizes are padded to even bytes
      if (fmtOffset !== -1 && dataOffset !== -1) break;
    }
    if (fmtOffset === -1 || dataOffset === -1) return;

    const audioFormat = readU16(fmtOffset + 0); // 1 = PCM
    const numChannels = readU16(fmtOffset + 2);
    const sampleRate = readU32(fmtOffset + 4);
    const bitsPerSample = readU16(fmtOffset + 14);
    if (audioFormat !== 1 || bitsPerSample !== 16) return; // Only PCM16 supported

    const pcmBytes = data.subarray(dataOffset, dataOffset + dataSize);

    if (numChannels === 1) {
      await this.addPCM16(pcmBytes, { sampleRate, ...options });
      return;
    }

    // Downmix stereo to mono
    const frameCount = Math.floor(pcmBytes.length / 4); // 2 bytes per sample x 2 channels
    const mono = new Int16Array(frameCount);
    let idx = 0;
    for (let f = 0; f < frameCount; f++) {
      const l = pcmBytes[idx] | (pcmBytes[idx+1] << 8); idx += 2;
      const r = pcmBytes[idx] | (pcmBytes[idx+1] << 8); idx += 2;
      let l16 = l >= 32768 ? l - 65536 : l;
      let r16 = r >= 32768 ? r - 65536 : r;
      const m = Math.max(-32768, Math.min(32767, (l16 + r16) >> 1));
      mono[f] = m;
    }

    await this.addPCM16(mono, { sampleRate, ...options });
  }
}