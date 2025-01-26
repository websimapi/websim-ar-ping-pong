export class HandTracker {
  constructor(videoId, canvasId) {
    this.video = document.getElementById(videoId);
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.updateCallback = null;
    
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

  async initialize() {
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

      // Set canvas size to match video
      const resizeCanvas = () => {
        this.canvas.width = this.video.clientWidth;
        this.canvas.height = this.video.clientHeight;
      };
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      const constraints = {
        video: {
          facingMode: this.video.id === 'front-camera' ? 'user' : 'environment',
          width: { ideal: 480 },
          height: { ideal: 360 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints).catch(error => {
        console.error('Camera access error:', error);
        throw new Error(`Failed to access ${this.video.id}: ${error.message}`);
      });

      this.video.srcObject = stream;
      await new Promise((resolve, reject) => {
        this.video.onloadedmetadata = resolve;
        this.video.onerror = reject;
      });

      await this.video.play().catch(error => {
        console.error('Video playback error:', error);
        throw new Error(`Failed to play video: ${error.message}`);
      });

      const camera = new Camera(this.video, {
        onFrame: async () => {
          await this.hands.send({image: this.video}).catch(console.error);
        },
        width: 480,
        height: 360
      });
      
      camera.start();
    } catch (error) {
      console.error('HandTracker initialization failed:', error);
      this.handleError(error);
    }
  }

  handleError(error) {
    // Add error message to the canvas
    this.ctx.fillStyle = 'red';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Camera Error: ${error.message}`, this.canvas.width/2, this.canvas.height/2);
    
    // Provide fallback behavior - use mouse/touch for control
    this.setupFallbackControls();
  }

  setupFallbackControls() {
    const updatePosition = (event) => {
      if (!this.updateCallback) return;
      
      let y;
      if (event.type.startsWith('touch')) {
        y = event.touches[0].clientY / window.innerHeight;
      } else {
        y = event.clientY / window.innerHeight;
      }
      
      // Create fake landmarks array with just the palm position
      const fakeLandmarks = Array(21).fill().map(() => ({x: 0.5, y}));
      this.updateCallback(fakeLandmarks);
    };

    // Add touch and mouse controls
    this.canvas.addEventListener('touchmove', updatePosition);
    this.canvas.addEventListener('mousemove', updatePosition);
  }

  onHandUpdate(callback) {
    this.updateCallback = callback;
  }

  drawHand(landmarks) {
    this.ctx.fillStyle = '#00FF00';
    for (const landmark of landmarks) {
      const x = landmark.x * this.canvas.width;
      const y = landmark.y * this.canvas.height;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }
}