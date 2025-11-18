const WebSocket = require('ws');
const EventEmitter = require('events');

class LiveSession extends EventEmitter {
  constructor(options) {
    super();
    
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.responseModalities = options.responseModalities || ['TEXT', 'AUDIO'];
    this.systemInstruction = options.systemInstruction;
    this.onMessage = options.onMessage;
    this.onError = options.onError;
    this.onClose = options.onClose;
    
    this.ws = null;
    this.connected = false;
    this.sessionId = null;
    

  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection with API key authentication
        const wsUrl = `${this.endpoint}?key=${this.apiKey}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          console.log('Live API WebSocket connected');
          this.connected = true;
          
          // Send initial setup message
          this.sendSetupMessage();
          resolve(this);
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            if (this.onError) {
              this.onError(error);
            }
          }
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.connected = false;
          if (this.onError) {
            this.onError(error);
          }
          reject(error);
        });

        this.ws.on('close', (code, reason) => {
          console.log('WebSocket closed:', code, reason.toString());
          this.connected = false;
          if (this.onClose) {
            this.onClose(code, reason.toString());
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  sendSetupMessage() {
    const setupMessage = {
      setup: {
        model: `models/${this.model}`,
        generationConfig: {
          responseModalities: this.responseModalities,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Zephyr'
              }
            }
          }
        },
        systemInstruction: {
          parts: [{
            text: this.systemInstruction
          }]
        }
      }
    };

    console.log('Sending setup message:', JSON.stringify(setupMessage, null, 2));
    this.sendRawMessage(setupMessage);
  }

  async sendMessage(message) {
    if (!this.connected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    const clientMessage = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{
            text: message
          }]
        }],
        turnComplete: true
      }
    };

    this.sendRawMessage(clientMessage);
  }

  async sendAudioData(audioData) {
    if (!this.connected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    const audioMessage = {
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm',
          data: audioData
        }]
      }
    };

    this.sendRawMessage(audioMessage);
  }

  sendRawMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket not ready');
    }
  }

  handleMessage(message) {
    try {
      // Handle different types of messages from the Live API
      if (message.setupComplete) {
        console.log('Live API setup complete');
        this.sessionId = message.setupComplete.metadata?.sessionId;
      }
      
      if (message.serverContent) {
        const serverContent = message.serverContent;
        
        // Handle text responses
        if (serverContent.modelTurn && serverContent.modelTurn.parts) {
          for (const part of serverContent.modelTurn.parts) {
            if (part.text && this.onMessage) {
              this.onMessage({
                type: 'text',
                content: part.text,
                timestamp: Date.now()
              });
            }
            
            // Handle audio responses
            if (part.inlineData && part.inlineData.mimeType === 'audio/pcm' && this.onMessage) {
              this.onMessage({
                type: 'audio',
                content: part.inlineData.data,
                mimeType: part.inlineData.mimeType,
                timestamp: Date.now()
              });
            }
          }
        }
        
        // Handle interruption feedback
        if (serverContent.interrupted && this.onMessage) {
          this.onMessage({
            type: 'interrupted',
            timestamp: Date.now()
          });
        }
      }
      
      // Handle tool calls
      if (message.toolCall && this.onMessage) {
        this.onMessage({
          type: 'toolCall',
          content: message.toolCall,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.error('Error handling message:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  close() {
    if (this.ws) {
      this.connected = false;
      this.ws.close();
      this.ws = null;
    }
  }

  // Method to check if session is still active
  isActive() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Method to send tool response
  async sendToolResponse(toolCallId, response) {
    if (!this.connected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    const toolResponseMessage = {
      toolResponse: {
        functionResponses: [{
          name: toolCallId,
          response: response
        }]
      }
    };

    this.sendRawMessage(toolResponseMessage);
  }
}

module.exports = LiveSession;