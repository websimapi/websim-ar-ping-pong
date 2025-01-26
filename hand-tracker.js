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

    const constraints = {
      video: {
        facingMode: this.video.id === 'front-camera' ? 'user' : 'environment'
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.video.srcObject = stream;
    this.video.play();

    const camera = new Camera(this.video, {
      onFrame: async () => {
        await this.hands.send({image: this.video});
      },
      width: 480,
      height: 360
    });
    camera.start();
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