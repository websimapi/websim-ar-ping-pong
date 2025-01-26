export class HandTracker {
  constructor(videoId, canvasId) {
    this.video = document.getElementById(videoId);
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.updateCallbacks = {
      front: null,
      back: null
    };
    
    this.currentCamera = 'front';
    this.lastProcessedCamera = 'front';
    this.lastFrameData = {
      front: null,
      back: null
    };
    
    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    
    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.isProcessing = false;
    this.currentStream = null;
    this.switchDelay = 16; // ~60fps switching
    this.lastSwitchTime = 0;
  }

  async initialize() {
    try {
      this.hands.onResults((results) => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          this.drawHand(landmarks);
          
          this.lastFrameData[this.lastProcessedCamera] = landmarks;
          
          const callback = this.updateCallbacks[this.lastProcessedCamera];
          if (callback) {
            callback(landmarks);
          }
        } else if (this.lastFrameData[this.lastProcessedCamera]) {
          const callback = this.updateCallbacks[this.lastProcessedCamera];
          if (callback) {
            callback(this.lastFrameData[this.lastProcessedCamera]);
          }
        }
      });

      const resizeCanvas = () => {
        this.canvas.width = this.video.clientWidth;
        this.canvas.height = this.video.clientHeight;
      };
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      await this.initializeCamera();
    } catch (error) {
      console.error('HandTracker initialization failed:', error);
      this.handleError(error);
    }
  }

  async initializeCamera() {
    try {
      const stream = await this.getCameraStream(true);
      this.video.srcObject = stream;
      await this.video.play();

      const processFrame = async () => {
        const now = performance.now();
        const timeSinceLastSwitch = now - this.lastSwitchTime;
        
        if (!this.isProcessing && timeSinceLastSwitch >= this.switchDelay) {
          this.isProcessing = true;
          this.lastSwitchTime = now;
          
          try {
            const isFrontCamera = this.currentCamera === 'front';
            const stream = await this.getCameraStream(!isFrontCamera);
            
            if (stream) {
              this.video.srcObject = stream;
              // Reduced settling time
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            await this.hands.send({image: this.video});
            
            this.lastProcessedCamera = this.currentCamera;
            this.currentCamera = isFrontCamera ? 'back' : 'front';
          } catch (error) {
            console.warn('Frame processing error:', error);
          } finally {
            this.isProcessing = false;
          }
        }
        
        requestAnimationFrame(processFrame);
      };
      
      processFrame();
    } catch (error) {
      console.error('Camera initialization failed:', error);
      this.handleError(error);
    }
  }

  async getCameraStream(isFrontCamera) {
    const constraints = {
      video: {
        facingMode: isFrontCamera ? "user" : "environment",
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 60 }
      }
    };

    try {
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
      }
      this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.currentStream;
    } catch (error) {
      console.warn(`Failed to get ${isFrontCamera ? 'front' : 'back'} camera:`, error);
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

    for (let i = 0; i < landmarks.length - 1; i++) {
      const current = landmarks[i];
      const next = landmarks[i + 1];
      
      this.ctx.beginPath();
      this.ctx.moveTo(current.x * this.canvas.width, current.y * this.canvas.height);
      this.ctx.lineTo(next.x * this.canvas.width, next.y * this.canvas.height);
      this.ctx.stroke();
    }

    for (const landmark of landmarks) {
      const x = landmark.x * this.canvas.width;
      const y = landmark.y * this.canvas.height;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }
}