var NUM_AVERAGED_TIMES = 10; // number of times from other player to keep and average

/* Represents a client-sided game. */
function Game(details) {
	// DOM elements
	this.container = document.getElementById('gameContainer');
	this.ballImg = document.getElementById('ballImg');
	this.nameTexts = [ document.getElementById('playerOneName'), document.getElementById('playerTwoName') ];
	this.scoreTexts = [ document.getElementById('playerOneScore'), document.getElementById('playerTwoScore') ];
	this.countdownText = document.getElementById('countdownText');

	// basic game variables (how's the board set up? how often to send updates? etc.)
	this.countdownLength = details.countdownLength;
	this.updateInterval = details.updateInterval;
	this.boardSize = details.boardSize;
	this.basePaddleVelocity = details.basePaddleVelocity;
	this.paddleDimensions = details.paddleDimensions;
	this.paddlePadding = details.paddlePadding;
	this.ballRadius = details.ballRadius;

	this.referenceTime = null;
	// last ten game times received from other player -- used to calculate end-to-end latency
	this.opponentTimes = [];
	// last times averaged from other player
	this.avgOpponentTime = null;

	// changing game variables (positions, speeds, etc.)
	this.lastUpdateTime = null; // when were positions last updated?
	this.playerI = null; // which player is this client? 0 or 1
	this.playerNames = [ username, '...' ];
	this.playerPositions = [ 50, 50 ];
	this.playerVelocities = [ 0, 0 ];
	this.playerScores = [ 0, 0 ];
	this.ballPos = [ 100, 50 ];
	this.ballVelocity = 0;
	this.ballAngle = 0;

	this.timeUpdate = this.timeUpdate.bind(this);
	this.gameLoop = this.gameLoop.bind(this);

	this.timeUpdateLoop = undefined; // loop for updating time between players -- loop reset every round start

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

Game.prototype.updateReferenceTime = function() {
	this.referenceTime = Date.now();
}

/* Adds time received to other times from other player and averages them. */
Game.prototype.addReceivedTime = function(time) {
	var i, avg = 0;
	this.opponentTimes.push(Date.now() - this.referenceTime - time);
	if(this.opponentTimes.length > NUM_AVERAGED_TIMES) 
		this.opponentTimes.splice(0, 1);
	for(i = 0; i < this.opponentTimes.length; ++i)
		avg += this.opponentTimes[i];
	avg /= this.opponentTimes.length;
	this.avgOpponentTime = avg;
	console.log('Average opponent ping: ' + avg);
}

Game.prototype.timeUpdate = function() {
	io.emit('time-update', Date.now() - this.referenceTime);
}

/* Shows the game components. */
Game.prototype.show = function() {
	this.container.style.display = 'block';
	this.updateNameTexts();
	this.render();
}

/* Hides the game components. */
Game.prototype.hide = function() {
	this.container.style.display = 'none';
}

/* Updates the name texts. */
Game.prototype.updateNameTexts = function() {
	for(var i = 0; i < this.nameTexts.length; ++i)
		this.nameTexts[i].textContent = this.playerNames[i];
}

/* Renders all components of the game's canvas. */
Game.prototype.render = function() {
	// clear screen
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// update each component of board
	this.drawDividerLine();
	this.drawBall();
	this.drawPaddles();
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

/* Starts a new round. */
Game.prototype.startRound = function() {
	console.log('New round starting.');
	this.updateReferenceTime();
	clearInterval(this.timeUpdateLoop);
	this.timeUpdateLoop = setInterval(this.timeUpdate, this.updateInterval);
	this.countdown();
}

/* Handles the countdown. */
Game.prototype.countdown = function() {
	var COUNTDOWN_STEP = 0.1;
	var countdown = (function() {
		var countdownLeft = this.countdownLength;
		return function() {
			countdownLeft -= COUNTDOWN_STEP;
			this.countdownText.textContent = countdownLeft;
			if(countdownLeft > 0) setTimeout(countdown, COUNTDOWN_STEP);
		}
	}).bind(this)();
	setTimeout(countdown, COUNTDOWN_STEP);
}

/* Main game loop. */
Game.prototype.gameLoop = function() {
}
