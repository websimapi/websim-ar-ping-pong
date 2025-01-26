import { HandTracker } from './hand-tracker.js';
import { PongGame } from './pong-game.js';

class GameController {
  constructor() {
    this.game = new PongGame();
    this.setupTrackers();
  }

  async setupTrackers() {
    try {
      this.frontTracker = new HandTracker('front-camera', 'front-overlay');
      this.backTracker = new HandTracker('back-camera', 'back-overlay');
      
      await Promise.all([
        this.frontTracker.initialize().catch(error => {
          console.error('Front camera initialization failed:', error);
          throw error;
        }),
        this.backTracker.initialize().catch(error => {
          console.error('Back camera initialization failed:', error);
          throw error;
        })
      ]);

      this.frontTracker.onHandUpdate((landmarks) => {
        const y = landmarks[9].y; // Palm position
        this.game.updatePlayerPosition(1, y);
      });

      this.backTracker.onHandUpdate((landmarks) => {
        const y = landmarks[9].y;
        this.game.updatePlayerPosition(2, y);
      });

      this.game.start();
    } catch (error) {
      console.error('Game initialization failed:', error);
      // Game will still start, but with fallback controls
      this.game.start();
    }
  }
}

window.addEventListener('load', () => {
  new GameController();
});