import { HandTracker } from './hand-tracker.js';
import { PongGame } from './pong-game.js';

class GameController {
  constructor() {
    this.game = new PongGame();
    this.setupTracker();
  }

  async setupTracker() {
    try {
      this.tracker = new HandTracker('camera', 'camera-overlay');
      await this.tracker.initialize();

      // Set up handlers for both cameras
      this.tracker.onHandUpdate((landmarks) => {
        const y = landmarks[9].y; // Palm position
        this.game.updatePlayerPosition(1, y);
      }, 'front');

      this.tracker.onHandUpdate((landmarks) => {
        const y = landmarks[9].y; // Palm position
        this.game.updatePlayerPosition(2, y);
      }, 'back');

      this.game.start();
    } catch (error) {
      console.error('Game initialization failed:', error);
      this.game.start();
    }
  }
}

window.addEventListener('load', () => {
  new GameController();
});