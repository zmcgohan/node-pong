/* Represents a client-sided game. */
function Game() {
	// DOM elements
	this.container = document.getElementById('gameContainer');
	this.ballImg = document.getElementById('ballImg');
	this.scoreTexts = [ document.getElementById('playerOneScore'), document.getElementById('playerTwoScore') ];

	// game variables
	this.boardSize = null;
	this.paddleDimensions = null;
	this.paddlePadding = null;
	this.ballRadius = null;
	this.playerNames = null;
	this.playerPositions = [ 50, 50 ];
	this.playerScores = [ 0, 0 ];
	this.ballPos = [ 100, 50 ];

	this.addEventListeners();
}

/* Adds all necessary events, including DOM and socket.io. */
Game.prototype.addEventListeners = function() {
	io.on('looking-for-game', function(data) {
		if(data.success) {
			console.log('Joined game.');
		}
	});
}

/* Fully updates screen for game. */
Game.prototype.fullUpdate = function() {
	this.drawDividerLine();
	this.drawBall();
	this.drawPaddles();
	this.updateScores();
	this.updatePlayerNames();
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
}

/* Update Game's variables from server data. */
Game.prototype.updateFromData = function(data) {
	if(data.playerPositions) {
		this.playerPositions = data.playerPositions;
	}
	if(data.ballPos) {
		this.ballPos = data.ballPos;
	}
	if(data.players) {
		this.players = data.players;
	}
	if(data.boardSize) {
		this.boardSize = data.boardSize;
	}
	if(data.paddleDimensions) {
		this.paddleDimensions = data.paddleDimensions;
	}
	if(data.paddlePadding) {
		this.paddlePadding = data.paddlePadding;
	}
	if(data.ballRadius) {
		this.ballRadius = data.ballRadius;
	}
	this.fullUpdate(); // redraw
}
