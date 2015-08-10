/* Represents a client-sided game. */
function Game() {
	// DOM elements
	this.container = document.getElementById('gameContainer');
	this.ballImg = document.getElementById('ballImg');
	this.nameTexts = [ document.getElementById('playerOneName'), document.getElementById('playerTwoName') ];
	this.scoreTexts = [ document.getElementById('playerOneScore'), document.getElementById('playerTwoScore') ];
	this.countdownText = document.getElementById('countdownText');

	// game variables
	this.lastUpdateTime = null;
	this.playerI = null; // which player is this client? 0 or 1
	this.boardSize = null;
	this.paddleDimensions = null;
	this.paddlePadding = null;
	this.ballRadius = null;
	this.basePaddleVelocity = null; // velocity at which players move
	this.playerNames = null;
	this.playerPositions = [ 50, 50 ];
	this.playerVelocities = [ 0, 0 ];
	this.playerScores = [ 0, 0 ];
	this.ballPos = [ 100, 50 ];
	this.ballVelocity = 0;
	this.ballAngle = 0;

	this.gameLoop = this.gameLoop.bind(this);

	this.addEventListeners();
}

/* Adds all necessary events, including DOM and socket.io. */
Game.prototype.addEventListeners = function() {
	// handle key down events
	window.onkeydown = (function(event) {
		var keyCode = event.which || event.keyCode;
		if(keyCode === UP_ARROW_KEY) {
			this.playerVelocities[this.playerI] = -this.basePaddleVelocity;
			io.emit('movement', { direction: -1 });
		} else if(keyCode === DOWN_ARROW_KEY) {
			this.playerVelocities[this.playerI] = this.basePaddleVelocity;
			io.emit('movement', { direction: 1 });
		}
	}).bind(this);
	// handle key up events
	window.onkeyup = (function(event) {
		var keyCode = event.which || event.keyCode;
		if(keyCode === UP_ARROW_KEY) {
			console.log('Stopping movement.');
			this.playerVelocities[this.playerI] = 0;
			io.emit('movement', { direction: 0, position: this.playerPositions[this.playerI] });
		} else if(keyCode === DOWN_ARROW_KEY) {
			console.log('Stopping movement.');
			this.playerVelocities[this.playerI] = 0;
			io.emit('movement', { direction: 0, position: this.playerPositions[this.playerI] });
		}
	}).bind(this);
}

/* Fully updates screen for game. */
Game.prototype.fullUpdate = function() {
	// clear screen
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// update each component of board
	this.drawDividerLine();
	this.drawBall();
	this.drawPaddles();
	this.updateScores();
	this.updateCountdown();
}

/* Shows the game components. */
Game.prototype.show = function() {
	this.container.style.display = 'block';
	this.fullUpdate();
}

/* Hides the game components. */
Game.prototype.hide = function() {
	this.container.style.display = 'none';
}

/* Updates the countdown text before a game begins. */
Game.prototype.updateCountdown = function() {
	if(this.countdownLeft > 0) {
		this.countdownText.style.display = 'block';
		this.countdownText.textContent = Math.ceil(this.countdownLeft);
	} else { 
		this.countdownText.style.display = 'none';
	}
}

/* Starts the game. Countdown over, game beginning. */
Game.prototype.startGame = function() {
	this.lastUpdateTime = (new Date()).getTime();
	requestAnimationFrame(this.gameLoop);
}

/* Local game loop. Predicts ball and paddle movement for smooth play. When receiving data, changes must keep smooth play. */
Game.prototype.gameLoop = function() {
	var secondsElapsed = ((new Date()).getTime() - this.lastUpdateTime) / 1000,
		leftPaddleX, rightPaddleX,
		newBallX, newBallY, zeroTime, zeroDist, ballYAtHit, paddleYAtHit;
	leftPaddleX = this.paddlePadding + this.paddleDimensions[0]/2;
	rightPaddleX = this.boardSize[0] - this.paddlePadding - this.paddleDimensions[0]/2;
	if(this.countdownLeft === 0) {
		// move ball and check for collisions
		newBallX = this.ballPos[0] + Math.cos(this.ballAngle) * this.ballVelocity * (this.boardSize[0]/this.boardSize[1]) * secondsElapsed;
		newBallY = this.ballPos[1] - Math.sin(this.ballAngle) * this.ballVelocity * secondsElapsed;
		if(newBallX - this.ballRadius <= leftPaddleX && this.ballPos[0] - this.ballRadius >= leftPaddleX) { // on left side
			zeroDist = this.ballPos[0] - this.ballRadius - leftPaddleX;
			zeroTime = zeroDist / (this.ballVelocity * -Math.cos(this.ballAngle));
			ballYAtHit = this.ballPos[1] + zeroDist * Math.tan(this.ballAngle);
			paddleYAtHit = this.playerPositions[0] + this.playerVelocities[0] * zeroTime;
			if(paddleYAtHit - this.paddleDimensions[1]/2 <= ballYAtHit + this.ballRadius
					&& paddleYAtHit + this.paddleDimensions[1]/2 >= ballYAtHit - this.ballRadius)
				console.log('Player 1 hit');
		} else if(newBallX + this.ballRadius >= rightPaddleX && this.ballPos[0] + this.ballRadius <= rightPaddleX) { // on right side
			zeroDist = rightPaddleX - this.ballPos[0] - this.ballRadius;
			zeroTime = zeroDist / (this.ballVelocity * Math.cos(this.ballAngle));
			ballYAtHit = this.ballPos[1] - zeroDist * Math.tan(this.ballAngle);
			paddleYAtHit = this.playerPositions[1] + this.playerVelocities[1] * zeroTime;
			if(paddleYAtHit - this.paddleDimensions[1]/2 <= ballYAtHit + this.ballRadius
					&& paddleYAtHit + this.paddleDimensions[1]/2 >= ballYAtHit - this.ballRadius)
				console.log('Player 2 hit');
		}
		this.ballPos[0] = newBallX;
		this.ballPos[1] = newBallY;
		// update paddle positions
		this.playerPositions[0] += this.playerVelocities[0] * secondsElapsed;
		this.playerPositions[1] += this.playerVelocities[1] * secondsElapsed;
	}

	this.fullUpdate();

	this.lastUpdateTime = (new Date()).getTime();
	requestAnimationFrame(this.gameLoop);
}

/* Draws the pong ball. */
Game.prototype.drawBall = function() {
	var x = this.ballPos[0] / this.boardSize[0] * canvas.width,
		y = this.ballPos[1] / this.boardSize[1] * canvas.height,
		ballRadius;
	ballRadius = this.ballRadius / this.boardSize[0] * canvas.width;
	x -= ballRadius;
	y -= ballRadius;
	ctx.drawImage(this.ballImg, x, y, ballRadius * 2, ballRadius * 2);
}

/* Draws the players' paddles. */
Game.prototype.drawPaddles = function() {
	var x, y, paddleWidthPx, paddleHeightPx, paddlePaddingPx;
	paddlePaddingPx = this.paddlePadding / this.boardSize[0] * canvas.width;
	paddleWidthPx = this.paddleDimensions[0] / this.boardSize[0] * canvas.width;
	paddleHeightPx = this.paddleDimensions[1] / this.boardSize[1] * canvas.height;
	ctx.fillStyle = '#fcfcfc';
	// draw player one's (left) paddle
	x = paddlePaddingPx - paddleWidthPx / 2;
	y = this.playerPositions[0] / this.boardSize[1] * canvas.height - paddleHeightPx / 2;
	ctx.fillRect(x, y, paddleWidthPx, paddleHeightPx);
	// draw player two's (right) paddle
	x = canvas.width - paddlePaddingPx - paddleWidthPx / 2;
	y = this.playerPositions[1] / this.boardSize[1] * canvas.height - paddleHeightPx / 2;
	ctx.fillRect(x, y, paddleWidthPx, paddleHeightPx);
}

/* Draws the center divider line. */
Game.prototype.drawDividerLine = function() {
	ctx.setLineDash([15]);
	ctx.lineWidth = 5;
	ctx.strokeStyle = '#fcfcfc';
	ctx.beginPath();
	ctx.moveTo(canvas.width / 2, 0);
	ctx.lineTo(canvas.width / 2, canvas.height);
	ctx.stroke();
}

/* Updates the players' scores. */
Game.prototype.updateScores = function() {
	this.scoreTexts[0].textContent = this.playerScores[0];
	this.scoreTexts[1].textContent = this.playerScores[1];
}

/* Updates the players' names. */
Game.prototype.updatePlayerNames = function() {
	this.nameTexts[0].textContent = this.players[0];
	this.nameTexts[1].textContent = this.players[1];
}

/* Update Game's variables from server data. */
Game.prototype.updateFromData = function(data) {
	if(data.players) {
		this.players = data.players;
		this.updatePlayerNames();
	}
	if(data.countdownLeft !== undefined) this.countdownLeft = data.countdownLeft;
	if(data.playerI !== undefined) this.playerI = data.playerI;
	if(data.playerPositions) {
		if(data.playerPositions[0] !== null) this.playerPositions[0] = data.playerPositions[0];
		if(data.playerPositions[1] !== null) this.playerPositions[1] = data.playerPositions[1];
	}
	if(data.playerVelocities) this.playerVelocities = data.playerVelocities;
	if(data.ballPos) this.ballPos = data.ballPos;
	if(data.ballVelocity !== undefined) this.ballVelocity = data.ballVelocity;
	if(data.ballAngle !== undefined) this.ballAngle = data.ballAngle;
	if(data.boardSize) this.boardSize = data.boardSize;
	if(data.basePaddleVelocity) this.basePaddleVelocity = data.basePaddleVelocity;
	if(data.paddleDimensions) this.paddleDimensions = data.paddleDimensions;
	if(data.paddlePadding !== undefined) this.paddlePadding = data.paddlePadding;
	if(data.ballRadius) this.ballRadius = data.ballRadius;
	if(data.playerScores) this.playerScores = data.playerScores;
	this.fullUpdate(); // redraw
}
