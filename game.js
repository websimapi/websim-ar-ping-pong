import { HandTracker } from './hand-tracker.js';
import { PongGame } from './pong-game.js';

class GameController {
  constructor() {
    this.game = new PongGame();
    this.currentPlayer = 1;
    this.usingFrontCamera = true;
    this.setupTracker();
    this.setupCameraSwitch();
  }

  async setupTracker() {
    try {
      this.tracker = new HandTracker('camera', 'camera-overlay');
      await this.tracker.initialize(this.usingFrontCamera);

      this.tracker.onHandUpdate((landmarks) => {
        const y = landmarks[9].y; // Palm position
        this.game.updatePlayerPosition(this.currentPlayer, y);
      });

      this.game.start();
    } catch (error) {
      console.error('Game initialization failed:', error);
      this.game.start();
    }
  }

  setupCameraSwitch() {
    const switchBtn = document.getElementById('switch-camera');
    switchBtn.addEventListener('click', async () => {
      this.usingFrontCamera = !this.usingFrontCamera;
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
      
      try {
        await this.tracker.switchCamera(this.usingFrontCamera);
      } catch (error) {
        console.error('Failed to switch camera:', error);
      }
    });
  }
}

window.addEventListener('load', () => {
  new GameController();
});