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
      // Start game anyway to allow fallback controls
      this.game.start();
    }
  }

  setupCameraSwitch() {
    const switchBtn = document.getElementById('switch-camera');
    let switching = false;

    switchBtn.addEventListener('click', async () => {
      if (switching) return; // Prevent multiple rapid switches
      switching = true;
      switchBtn.disabled = true;
      
      try {
        this.usingFrontCamera = !this.usingFrontCamera;
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        await this.tracker.switchCamera(this.usingFrontCamera);
      } catch (error) {
        console.error('Failed to switch camera:', error);
        // Revert changes on failure
        this.usingFrontCamera = !this.usingFrontCamera;
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
      } finally {
        switching = false;
        switchBtn.disabled = false;
      }
    });
  }
}

window.addEventListener('load', () => {
  new GameController();
});