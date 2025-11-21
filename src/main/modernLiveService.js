// Modern Gemini Live API implementation with native audio support
// Dependencies: @google/genai, mime
import { 
  GoogleGenAI, 
  LiveServerMessage, 
  MediaResolution, 
  Modality, 
  Session, 
} from '@google/genai';
import mime from 'mime';
import { writeFile } from 'fs';
import { EventEmitter } from 'events';

class ModernLiveService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    this.model = options.model || 'models/gemini-2.5-flash-preview-native-audio-dialog';
    this.voiceName = options.voiceName || 'Zephyr';
    this.systemInstruction = options.systemInstruction || 'You are a helpful language learning assistant.';
    
    this.responseQueue = [];
    this.session = null;
    this.audioParts = [];
    this.isConnected = false;
  }

  async connect() {
    try {
      const ai = new GoogleGenAI({
        apiKey: this.apiKey,
      });

      const config = {
        responseModalities: [
          Modality.AUDIO,
          Modality.TEXT,
        ],
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: this.voiceName,
            }
          }
        },
        contextWindowCompression: {
          triggerTokens: '25600',
          slidingWindow: { targetTokens: '12800' },
        },
        systemInstruction: {
          parts: [{ text: this.systemInstruction }]
        }
      };

      this.session = await ai.live.connect({
        model: this.model,
        callbacks: {
          onopen: () => {
            console.log('Modern Live API connected');
            this.isConnected = true;
            this.emit('connected');
          },
          onmessage: (message) => {
            this.responseQueue.push(message);
            this.handleMessage(message);
          },
          onerror: (error) => {
            console.error('Live API error:', error);
            this.emit('error', error);
          },
          onclose: (event) => {
            console.log('Live API closed:', event.reason);
            this.isConnected = false;
            this.emit('disconnected', event.reason);
          },
        },
        config
      });

      return this.session;
    } catch (error) {
      console.error('Failed to connect to Live API:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async sendMessage(text) {
    if (!this.session || !this.isConnected) {
      throw new Error('Session not connected');
    }

    try {
      await this.session.sendClientContent({
        turns: [{
          role: 'user',
          parts: [{ text }]
        }],
        turnComplete: true
      });
    } catch (error) {
      console.error('Error sending message:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async sendAudioData(audioData, mimeType = 'audio/pcm') {
    if (!this.session || !this.isConnected) {
      throw new Error('Session not connected');
    }

    try {
      await this.session.sendClientContent({
        turns: [{
          role: 'user',
          parts: [{
            inlineData: {
              mimeType,
              data: audioData
            }
          }]
        }],
        turnComplete: true
      });
    } catch (error) {
      console.error('Error sending audio:', error);
      this.emit('error', error);
      throw error;
    }
  }

  handleMessage(message) {
    try {
      if (message.serverContent?.modelTurn?.parts) {
        const parts = message.serverContent.modelTurn.parts;
        
        for (const part of parts) {
          // Handle file data
          if (part.fileData) {
            console.log(`File: ${part.fileData.fileUri}`);
            this.emit('fileData', part.fileData);
          }

          // Handle inline audio data
          if (part.inlineData) {
            const inlineData = part.inlineData;
            this.audioParts.push(inlineData.data || '');
            
            // Convert and save audio
            const buffer = this.convertToWav(this.audioParts, inlineData.mimeType || '');
            this.saveAudioFile('response_audio.wav', buffer);
            
            this.emit('audioData', {
              data: inlineData.data,
              mimeType: inlineData.mimeType,
              buffer
            });
          }

          // Handle text responses
          if (part.text) {
            console.log('AI Response:', part.text);
            this.emit('textResponse', part.text);
          }
        }
      }

      // Handle turn completion
      if (message.serverContent?.turnComplete) {
        this.emit('turnComplete');
      }

      // Handle interruptions
      if (message.serverContent?.interrupted) {
        this.emit('interrupted');
      }

    } catch (error) {
      console.error('Error handling message:', error);
      this.emit('error', error);
    }
  }

  async handleTurn() {
    const turn = [];
    let done = false;
    
    while (!done) {
      const message = await this.waitMessage();
      turn.push(message);
      
      if (message.serverContent && message.serverContent.turnComplete) {
        done = true;
      }
    }
    
    return turn;
  }

  async waitMessage() {
    return new Promise((resolve) => {
      const checkQueue = () => {
        const message = this.responseQueue.shift();
        if (message) {
          resolve(message);
        } else {
          setTimeout(checkQueue, 100);
        }
      };
      checkQueue();
    });
  }

  saveAudioFile(fileName, content) {
    writeFile(fileName, content, (err) => {
      if (err) {
        console.error(`Error writing audio file ${fileName}:`, err);
        return;
      }
      console.log(`Audio saved to ${fileName}`);
    });
  }

  convertToWav(rawData, mimeType) {
    const options = this.parseMimeType(mimeType);
    const dataLength = rawData.reduce((a, b) => a + b.length, 0);
    const wavHeader = this.createWavHeader(dataLength, options);
    const buffer = Buffer.concat(rawData.map(data => Buffer.from(data, 'base64')));
    
    return Buffer.concat([wavHeader, buffer]);
  }

  parseMimeType(mimeType) {
    const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
    const [_, format] = fileType.split('/');

    const options = {
      numChannels: 1,
      bitsPerSample: 16,
      sampleRate: 24000, // Default sample rate
    };

    if (format && format.startsWith('L')) {
      const bits = parseInt(format.slice(1), 10);
      if (!isNaN(bits)) {
        options.bitsPerSample = bits;
      }
    }

    for (const param of params) {
      const [key, value] = param.split('=').map(s => s.trim());
      if (key === 'rate') {
        options.sampleRate = parseInt(value, 10);
      }
    }

    return options;
  }

  createWavHeader(dataLength, options) {
    const {
      numChannels,
      sampleRate,
      bitsPerSample,
    } = options;

    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const buffer = Buffer.alloc(44);

    buffer.write('RIFF', 0);                      // ChunkID
    buffer.writeUInt32LE(36 + dataLength, 4);     // ChunkSize
    buffer.write('WAVE', 8);                      // Format
    buffer.write('fmt ', 12);                     // Subchunk1ID
    buffer.writeUInt32LE(16, 16);                 // Subchunk1Size (PCM)
    buffer.writeUInt16LE(1, 20);                  // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);        // NumChannels
    buffer.writeUInt32LE(sampleRate, 24);         // SampleRate
    buffer.writeUInt32LE(byteRate, 28);           // ByteRate
    buffer.writeUInt16LE(blockAlign, 32);         // BlockAlign
    buffer.writeUInt16LE(bitsPerSample, 34);      // BitsPerSample
    buffer.write('data', 36);                     // Subchunk2ID
    buffer.writeUInt32LE(dataLength, 40);         // Subchunk2Size

    return buffer;
  }

  async disconnect() {
    if (this.session) {
      try {
        await this.session.close();
        this.isConnected = false;
        this.emit('disconnected');
      } catch (error) {
        console.error('Error disconnecting:', error);
        this.emit('error', error);
      }
    }
  }

  // Clear audio parts for new conversation
  clearAudioParts() {
    this.audioParts = [];
  }
}

export default ModernLiveService;