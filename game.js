import { HandTracker } from './hand-tracker.js';
import { PongGame } from './pong-game.js';

class GameController {
  constructor() {
    this.game = new PongGame();
    this.frontTracker = new HandTracker('front-camera', 'front-overlay');
    this.backTracker = new HandTracker('back-camera', 'back-overlay');
    
    this.init();
  }

  async init() {
    await Promise.all([
      this.frontTracker.initialize(),
      this.backTracker.initialize()
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
  }
}

new GameController();