class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = [];
    this.reconnectTimer = null;
    this.audioContext = null;
    this.soundEnabled = true;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || '127.0.0.1';
    const port = 8000;
    const wsUrl = `${protocol}//${host}:${port}/ws/alerts`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ Connected to IBVAP Real-Time Alert Stream');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'SECURITY_ALERT') {
            if (this.soundEnabled) {
              this.playTacticalAlertSound(payload.data?.risk_level);
            }
          }
          this.notifyListeners(payload);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        console.warn('⚠️ WebSocket disconnected. Reconnecting in 3s...');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        this.ws?.close();
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 3000);
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(data) {
    this.listeners.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error('Error in WebSocket listener:', e);
      }
    });
  }

  playTacticalAlertSound(riskLevel = 'CRITICAL') {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      if (riskLevel === 'CRITICAL') {
        osc.frequency.setValueAtTime(880, this.audioContext.currentTime); // High pitch alarm
        osc.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(587.33, this.audioContext.currentTime); // D5 chime
      }

      gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.35);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.35);
    } catch (e) {
      // Audio playback might require user interaction first
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }
}

export const wsService = new WebSocketService();
