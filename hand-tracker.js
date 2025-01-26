export class HandTracker {
  constructor(videoId, canvasId) {
    this.video = document.getElementById(videoId);
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.updateCallback = null;
    this.camera = null;
    this.retryAttempts = 0;
    this.maxRetries = 3;
    
    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    
    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
  }

  async initialize(useFrontCamera = true) {
    try {
      this.hands.onResults((results) => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          this.drawHand(landmarks);
          if (this.updateCallback) {
            this.updateCallback(landmarks);
          }
        }
      });

      const resizeCanvas = () => {
        this.canvas.width = this.video.clientWidth;
        this.canvas.height = this.video.clientHeight;
      };
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      await this.startCamera(useFrontCamera);
    } catch (error) {
      console.error('HandTracker initialization failed:', error);
      this.handleError(error);
    }
  }

  async startCamera(useFrontCamera) {
    if (this.video.srcObject) {
      const tracks = this.video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }

    const constraints = {
      video: {
        facingMode: useFrontCamera ? "user" : "environment",
        width: { ideal: 480 },
        height: { ideal: 360 }
      }
    };

    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported');
      }

      // Get list of available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      if (videoDevices.length === 0) {
        throw new Error('No video devices found');
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = stream;
      
      await new Promise((resolve, reject) => {
        this.video.onloadedmetadata = resolve;
        this.video.onerror = reject;
        // Add timeout to prevent hanging
        setTimeout(reject, 5000, new Error('Video load timeout'));
      });
      
      await this.video.play();

      if (this.camera) {
        this.camera.stop();
      }

      this.camera = new Camera(this.video, {
        onFrame: async () => {
          try {
            await this.hands.send({image: this.video});
          } catch (error) {
            console.warn('Frame processing error:', error);
          }
        },
        width: 480,
        height: 360
      });
      
      this.camera.start();
      this.retryAttempts = 0; // Reset retry counter on successful start
    } catch (error) {
      console.error('Camera start error:', error);
      if (this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        console.log(`Retrying camera start (attempt ${this.retryAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        return this.startCamera(useFrontCamera);
      }
      throw error;
    }
  }

  async switchCamera(useFrontCamera) {
    try {
      await this.startCamera(useFrontCamera);
    } catch (error) {
      console.error('Camera switch failed:', error);
      this.handleError(error);
    }
  }

  handleError(error) {
    console.error('Camera error:', error);
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'white';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Camera Error: ${error.message}`, this.canvas.width/2, this.canvas.height/2);
    this.ctx.fillText('Using touch/mouse controls instead', this.canvas.width/2, this.canvas.height/2 + 30);
    this.setupFallbackControls();
  }

  setupFallbackControls() {
    const updatePosition = (event) => {
      if (!this.updateCallback) return;
      
      let y;
      if (event.type.startsWith('touch')) {
        event.preventDefault();
        y = event.touches[0].clientY / window.innerHeight;
      } else {
        y = event.clientY / window.innerHeight;
      }
      
      const fakeLandmarks = Array(21).fill().map(() => ({x: 0.5, y}));
      this.updateCallback(fakeLandmarks);
    };

    this.canvas.addEventListener('touchmove', updatePosition, { passive: false });
    this.canvas.addEventListener('mousemove', updatePosition);
  }

  onHandUpdate(callback) {
    this.updateCallback = callback;
  }

  drawHand(landmarks) {
    this.ctx.fillStyle = '#00FF00';
    this.ctx.strokeStyle = '#00FF00';
    this.ctx.lineWidth = 2;

    // Draw connections between landmarks
    for (let i = 0; i < landmarks.length - 1; i++) {
      const current = landmarks[i];
      const next = landmarks[i + 1];
      
      this.ctx.beginPath();
      this.ctx.moveTo(current.x * this.canvas.width, current.y * this.canvas.height);
      this.ctx.lineTo(next.x * this.canvas.width, next.y * this.canvas.height);
      this.ctx.stroke();
    }

    // Draw landmarks
    for (const landmark of landmarks) {
      const x = landmark.x * this.canvas.width;
      const y = landmark.y * this.canvas.height;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }
}