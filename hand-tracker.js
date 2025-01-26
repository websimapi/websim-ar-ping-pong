export class HandTracker {
  constructor(videoId, canvasId) {
    this.video = document.getElementById(videoId);
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.updateCallbacks = {
      front: null,
      back: null
    };
    this.cameras = {
      front: null,
      back: null
    };
    this.streams = {
      front: null,
      back: null
    };
    this.currentCamera = 'front';
    
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

    // Frame switching
    this.frameCount = 0;
    this.switchEveryNFrames = 2;
  }

  async initialize() {
    try {
      this.hands.onResults((results) => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          this.drawHand(landmarks);
          if (this.updateCallbacks[this.currentCamera]) {
            this.updateCallbacks[this.currentCamera](landmarks);
          }
        }
      });

      const resizeCanvas = () => {
        this.canvas.width = this.video.clientWidth;
        this.canvas.height = this.video.clientHeight;
      };
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      // Initialize both cameras
      await this.initializeCameras();
    } catch (error) {
      console.error('HandTracker initialization failed:', error);
      this.handleError(error);
    }
  }

  async initializeCameras() {
    // Initialize front camera
    this.streams.front = await this.getCameraStream(true);
    // Initialize back camera
    this.streams.back = await this.getCameraStream(false);

    // Set initial video source
    this.video.srcObject = this.streams.front;
    await this.video.play();

    // Setup camera processor
    const cameraProcessor = new Camera(this.video, {
      onFrame: async () => {
        try {
          this.frameCount++;
          if (this.frameCount % this.switchEveryNFrames === 0) {
            // Switch between cameras
            this.currentCamera = this.currentCamera === 'front' ? 'back' : 'front';
            this.video.srcObject = this.streams[this.currentCamera];
          }
          await this.hands.send({image: this.video});
        } catch (error) {
          console.warn('Frame processing error:', error);
        }
      },
      width: 480,
      height: 360
    });
    
    cameraProcessor.start();
  }

  async getCameraStream(isFrontCamera) {
    const constraints = {
      video: {
        facingMode: isFrontCamera ? "user" : "environment",
        width: { ideal: 480 },
        height: { ideal: 360 }
      }
    };

    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error(`Failed to get ${isFrontCamera ? 'front' : 'back'} camera:`, error);
      this.handleError(error);
      return null;
    }
  }

  onHandUpdate(callback, camera) {
    this.updateCallbacks[camera] = callback;
  }

  handleError(error) {
    console.error('Camera error:', error);
    this.setupFallbackControls();
  }

  setupFallbackControls() {
    const updatePosition = (event) => {
      event.preventDefault();
      
      let y;
      if (event.type.startsWith('touch')) {
        y = event.touches[0].clientY / window.innerHeight;
      } else {
        y = event.clientY / window.innerHeight;
      }
      
      const fakeLandmarks = Array(21).fill().map(() => ({x: 0.5, y}));
      Object.values(this.updateCallbacks).forEach(callback => {
        if (callback) callback(fakeLandmarks);
      });
    };

    this.canvas.addEventListener('touchmove', updatePosition, { passive: false });
    this.canvas.addEventListener('mousemove', updatePosition);
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