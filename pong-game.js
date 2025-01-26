export class PongGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.ballSize = 10;
    this.paddleWidth = 10;
    this.paddleHeight = 60;
    
    this.ball = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      dx: 5,
      dy: 5
    };
    
    this.players = {
      1: { y: this.canvas.height / 2 },
      2: { y: this.canvas.height / 2 }
    };
    
    this.score = {
      1: 0,
      2: 0
    };

    // Set canvas size
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start() {
    this.gameLoop();
  }

  updatePlayerPosition(player, y) {
    this.players[player].y = y * this.canvas.height;
  }

  gameLoop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    // Update ball position
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // Ball collision with top and bottom
    if (this.ball.y <= 0 || this.ball.y >= this.canvas.height) {
      this.ball.dy *= -1;
    }

    // Ball collision with paddles
    if (this.ball.x <= this.paddleWidth && 
        this.ball.y >= this.players[1].y - this.paddleHeight/2 && 
        this.ball.y <= this.players[1].y + this.paddleHeight/2) {
      this.ball.dx *= -1;
    }
    
    if (this.ball.x >= this.canvas.width - this.paddleWidth && 
        this.ball.y >= this.players[2].y - this.paddleHeight/2 && 
        this.ball.y <= this.players[2].y + this.paddleHeight/2) {
      this.ball.dx *= -1;
    }

    // Score points
    if (this.ball.x <= 0) {
      this.score[2]++;
      this.resetBall();
    }
    if (this.ball.x >= this.canvas.width) {
      this.score[1]++;
      this.resetBall();
    }
  }

  resetBall() {
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height / 2;
    this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 5;
    this.ball.dy = (Math.random() * 2 - 1) * 5;
  }

  draw() {
    // Clear canvas
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw center line
    this.ctx.setLineDash([5, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.strokeStyle = 'white';
    this.ctx.stroke();

    // Draw paddles
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, this.players[1].y - this.paddleHeight/2, 
                      this.paddleWidth, this.paddleHeight);
    this.ctx.fillRect(this.canvas.width - this.paddleWidth, 
                      this.players[2].y - this.paddleHeight/2,
                      this.paddleWidth, this.paddleHeight);

    // Draw ball
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ballSize, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw score
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.score[1], this.canvas.width * 0.25, 50);
    this.ctx.fillText(this.score[2], this.canvas.width * 0.75, 50);
  }
}