var NUM_AVERAGED_TIMES = 10, // number of times from other player to keep and average
	MAX_BOUNCE_ANGLE = Math.PI / 3;

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
	this.ballStartVelocity = details.ballStartVelocity;
	this.ballVelocity = this.ballStartVelocity;
	this.ballVelocityStep = details.ballVelocityStep;

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
	// position of player visually -- if any sudden jumps (like from lag) are made to playerPositions, this allows smooth fixing visually
	this.boardPlayerPositions = [ 50, 50 ]; 
	this.playerVelocities = [ 0, 0 ];
	this.playerScores = [ 0, 0 ];
	this.ballPos = [ 100, 50 ];
	this.ballAngle = 0;
	this.lastBallHitTime = null;
	this.getBallPos = null; // ball position function

	this.timeUpdate = this.timeUpdate.bind(this);
	this.countdown = this.countdown.bind(this);
	this.gameLoop = this.gameLoop.bind(this);

	this.timeUpdateLoop = undefined; // loop for updating time between players -- loop reset every round start

	this.addEventListeners();
}

/* Adds all necessary events, including DOM and socket.io. */
Game.prototype.addEventListeners = function() {
	// handle key down events
	window.onkeydown = (function(event) {
		if(!game) return;
		var keyCode = event.which || event.keyCode;
		if(keyCode === UP_ARROW_KEY && this.playerVelocities[this.playerI] !== -this.basePaddleVelocity) {
			this.playerVelocities[this.playerI] = -this.basePaddleVelocity;
			io.emit('movement-update', { direction: -1 });
		} else if(keyCode === DOWN_ARROW_KEY && this.playerVelocities[this.playerI] !== this.basePaddleVelocity) {
			this.playerVelocities[this.playerI] = this.basePaddleVelocity;
			io.emit('movement-update', { direction: 1 });
		}
	}).bind(this);
	// handle key up events
	window.onkeyup = (function(event) {
		if(!game) return;
		var keyCode = event.which || event.keyCode;
		if(keyCode === UP_ARROW_KEY && this.playerVelocities[this.playerI] === -this.basePaddleVelocity) {
			this.playerVelocities[this.playerI] = 0;
			io.emit('movement-update', { direction: 0, position: this.playerPositions[this.playerI] });
		} else if(keyCode === DOWN_ARROW_KEY && this.playerVelocities[this.playerI] === this.basePaddleVelocity) {
			this.playerVelocities[this.playerI] = 0;
			io.emit('movement-update', { direction: 0, position: this.playerPositions[this.playerI] });
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
}

/* Sends out time relative to start-of-round to other player. */
Game.prototype.timeUpdate = function() {
	io.emit('time-update', Date.now() - this.referenceTime);
}

/* Handles new movement data from other player. */
Game.prototype.handleMovementUpdate = function(data) {
	var otherPlayerI = (this.playerI+1) % 2;
	if(data.direction === -1) { // moving up
		this.playerVelocities[otherPlayerI] = -this.basePaddleVelocity;
	} else if(data.direction === 1) { // moving down
		this.playerVelocities[otherPlayerI] = this.basePaddleVelocity;
	} else if(data.direction === 0) { // stopping
		this.playerVelocities[otherPlayerI] = 0;
		this.playerPositions[otherPlayerI] = data.position;
	}
}

/* Handles a ball hit update from other player. */
Game.prototype.handleBallHit = function(data) {
	this.getBallPos = this.getBallPathFunc(data.angle, data.pos[0], data.pos[1], data.velocity, this.lastBallHitTime);
}

/* Shows the game components. */
Game.prototype.show = function() {
	this.container.style.display = 'block';
	this.updateNameTexts();
	this.updateScoreTexts();
	this.render();
}

/* Hides the game components. */
Game.prototype.hide = function() {
	this.container.style.display = 'none';
	this.countdownText.style.display = 'none';
}

/* Updates the name texts. */
Game.prototype.updateNameTexts = function() {
	for(var i = 0; i < this.nameTexts.length; ++i)
		this.nameTexts[i].textContent = this.playerNames[i];
}

/* Updates the score texts. */
Game.prototype.updateScoreTexts = function() {
	for(var i = 0; i < this.playerScores.length; ++i)
		this.scoreTexts[i].textContent = this.playerScores[i];
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

/* Calculates the ball's path from a starting point with specified angle and velocity. */
Game.prototype.getBallPathFunc = function(angle, x, y, v, startT) {
	var boardHeight = this.boardSize[1], ballRadius = this.ballRadius * (this.boardSize[1] / this.boardSize[0]),
		bouncePeriod = Math.abs((this.boardSize[1] - ballRadius*2) / (Math.sin(angle) * v) * 2);
	return (function() {
		var startTime = startT;
		if(angle > 0 && angle < Math.PI) { // ball is going up 
			return function(t) {
				t = (t - startTime) / 1000;
				var modT = Math.abs((t + ((boardHeight-y) / boardHeight) * (bouncePeriod / 2) + bouncePeriod / 2) % bouncePeriod); // difference in time from base graph
				return [
					Math.cos(angle) * v * t + x,
					boardHeight - (Math.abs(-1 + modT / (bouncePeriod / 2)) * (boardHeight-2*ballRadius)) - ballRadius
				]
			}
		} else if(angle > Math.PI && angle < 2 * Math.PI) { // ball is going down
			return function(t) {
				t = (t - startTime) / 1000;
				var modT = Math.abs((t + (y / boardHeight) * (bouncePeriod / 2)) % bouncePeriod);
				return [
					Math.cos(angle) * v * t + x,
					Math.abs(Math.abs(-1 + modT / (bouncePeriod / 2)) * (boardHeight-2*ballRadius) - boardHeight) - ballRadius
				]
			}
		} else { // ball is going completely horizontal
			return function(t) {
				t = (t - startTime) / 1000;
				return [
					Math.cos(angle) * v * t + x,
					y
				]
			}
		}
	})();
}

Game.prototype.testGetBallPath = function() {
	var f = game.getBallPathFunc(Math.PI / 6, 100, 50, 20),
		i, coords;
	ctx.fillStyle = '#ccc';
	for(i = -100; i <= 100; i += 0.002) {
		coords = f(i);
		//console.log(i + ' = ' + coords);
		ctx.fillRect(coords[0] * (canvas.width / this.boardSize[0]), coords[1] * (canvas.height / this.boardSize[1]), 1, 1);
	}
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
	//y = this.playerPositions[0] / this.boardSize[1] * canvas.height - paddleHeightPx / 2;
	y = this.boardPlayerPositions[0] / this.boardSize[1] * canvas.height - paddleHeightPx / 2;
	ctx.fillRect(x, y, paddleWidthPx, paddleHeightPx);
	// draw player two's (right) paddle
	x = canvas.width - paddlePaddingPx - paddleWidthPx / 2;
	//y = this.playerPositions[1] / this.boardSize[1] * canvas.height - paddleHeightPx / 2;
	y = this.boardPlayerPositions[1] / this.boardSize[1] * canvas.height - paddleHeightPx / 2;
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

/* Starts a new round and sets the ball's initial position function. */
Game.prototype.startRound = function(ballAngle) {
	console.log('New round starting.');
	this.ballAngle = ballAngle;
	this.playerPositions = [ this.boardSize[1] / 2, this.boardSize[1] / 2 ];
	this.updateReferenceTime();
	clearInterval(this.timeUpdateLoop);
	this.timeUpdateLoop = setInterval(this.timeUpdate, this.updateInterval);
	this.countdownLeft = this.countdownLength;
	this.countdown();
}

/* Handles the countdown before each round. After countdown is over, goes into game loop. */
var COUNTDOWN_STEP = 0.1;
Game.prototype.countdown = function() {
	if(this.gameOver) return;
	if(this.countdownLeft > 0) {
		this.countdownText.style.display = 'block';
		this.countdownText.style.fontSize = '300%';
		this.countdownText.textContent = Math.ceil(this.countdownLeft);
		this.countdownLeft -= COUNTDOWN_STEP;
		setTimeout(this.countdown, COUNTDOWN_STEP*1000);
	} else {
		this.countdownText.style.display = 'none';
		this.lastUpdateTime = Date.now();
		this.getBallPos = this.getBallPathFunc(this.ballAngle, this.boardSize[0] / 2, this.boardSize[1] / 2, this.ballVelocity, Date.now());
		this.gameLoop();
	}
}

/* Main game loop. */
Game.prototype.gameLoop = function() {
	if(this.gameOver) {
		return;
	}
	var secondsElapsed = (Date.now() - this.lastUpdateTime) / 1000;

	var roundTime = (Date.now() - this.referenceTime - this.countdownLength * 1000) / 1000;
	var ballPos = this.getBallPos(Date.now());
	// check for paddle collisions
	var radiusY = this.ballRadius * (this.boardSize[1] / this.boardSize[0]);
	if(ballPos[0] - this.ballRadius <= this.paddlePadding + this.paddleDimensions[0] / 2
			&& this.ballPos[0] - this.ballRadius > this.paddlePadding + this.paddleDimensions[0] / 2) { // passing left paddle
		this.lastBallHitTime = Date.now();
		var timeToHit = ((this.ballPos[0] - this.ballRadius) - (this.paddlePadding + this.paddleDimensions[0] / 2)) / this.ballVelocity,
			ballPosAtHit = this.getBallPos(Date.now() + timeToHit);
			paddlePosAtHit = this.playerPositions[0] + this.playerVelocities[0]*timeToHit;
		if(paddlePosAtHit - this.paddleDimensions[1] / 2 <= ballPosAtHit[1]+radiusY
				&& paddlePosAtHit + this.paddleDimensions[1] / 2 >= ballPosAtHit[1]-radiusY) { // left paddle hit
			var distFromCenter = ballPosAtHit[1] - paddlePosAtHit,
				maxDistance = this.paddleDimensions[1] / 2 + radiusY,
				percentDistance = distFromCenter / maxDistance,
				newAngle = (2*Math.PI - percentDistance * MAX_BOUNCE_ANGLE) % (2*Math.PI);
			this.ballAngle = newAngle;
			this.ballVelocity += this.ballVelocityStep;
			this.getBallPos = this.getBallPathFunc(newAngle, ballPosAtHit[0], ballPosAtHit[1], this.ballVelocity, this.lastBallHitTime);
			if(this.playerI === 0)
				io.emit('ball-hit', { pos: ballPosAtHit, angle: newAngle });
		}
	} else if(ballPos[0] + this.ballRadius >= this.boardSize[0] - this.paddlePadding - this.paddleDimensions[0] / 2
			&& this.ballPos[0] + this.ballRadius < this.boardSize[0] - this.paddlePadding - this.paddleDimensions[0] / 2) { // passing right paddle
		this.lastBallHitTime = Date.now();
		var timeToHit = ((this.boardSize[0] - this.paddlePadding - this.paddleDimensions[0] / 2) - (this.ballPos[0] + this.ballRadius)) / this.ballVelocity,
			ballPosAtHit = this.getBallPos(Date.now() + timeToHit);
			paddlePosAtHit = this.playerPositions[1] + this.playerVelocities[1]*timeToHit;
		if(paddlePosAtHit - this.paddleDimensions[1] / 2 <= ballPosAtHit[1]+radiusY
				&& paddlePosAtHit + this.paddleDimensions[1] / 2 >= ballPosAtHit[1]-radiusY) { // right paddle hit
			var distFromCenter = ballPosAtHit[1] - paddlePosAtHit,
				maxDistance = this.paddleDimensions[1] / 2 + this.ballRadius * (this.boardSize[1] / this.boardSize[0]),
				percentDistance = distFromCenter / maxDistance,
				newAngle = Math.PI + percentDistance * MAX_BOUNCE_ANGLE;
			this.ballAngle = newAngle;
			this.ballVelocity += this.ballVelocityStep;
			this.getBallPos = this.getBallPathFunc(newAngle, ballPosAtHit[0], ballPosAtHit[1], this.ballVelocity, this.lastBallHitTime);
			if(this.playerI === 1)
				io.emit('ball-hit', { pos: ballPosAtHit, angle: newAngle });
		}
	}
	this.ballPos = ballPos;

	this.updatePaddlePositions(secondsElapsed);

	// check for score
	if(this.ballPos[0] < 0) { // player 2 scored
		io.emit('player-scored', { player: 1 });
		this.getBallPos = function() { return [ this.boardSize[0] / 2, this.boardSize[1] / 2 ] };
	} else if(this.ballPos[0] > this.boardSize[0]) { // player 1 scored
		io.emit('player-scored', { player: 0 });
		this.getBallPos = function() { return [ this.boardSize[0] / 2, this.boardSize[1] / 2 ] };
	}

	this.render();

	this.lastUpdateTime = Date.now();
	requestAnimationFrame(this.gameLoop);
}

/* Updates the paddle positions based on time elapsed. */
var CATCH_UP_MODIFIER = 2.0; // speed modifier for when catching visual paddle position up with actual position
Game.prototype.updatePaddlePositions = function(secondsElapsed) {
	// update actual position of player
	if(this.countdownLeft <= 0) {
		for(var i = 0; i < this.playerPositions.length; ++i) {
			this.playerPositions[i] += this.playerVelocities[i] * secondsElapsed;
			if(this.playerPositions[i] < this.paddleDimensions[1] / 2) 
				this.playerPositions[i] = this.paddleDimensions[1] / 2;
			else if(this.playerPositions[i] > this.boardSize[1] - this.paddleDimensions[1] / 2)
				this.playerPositions[i] = this.boardSize[1] - this.paddleDimensions[1] / 2;
		}
	}
	// update visual location of paddles
	for(i = 0; i < this.boardPlayerPositions.length; ++i) {
		if(this.boardPlayerPositions[i] < this.playerPositions[i]) {
			this.boardPlayerPositions[i] += this.basePaddleVelocity * CATCH_UP_MODIFIER * secondsElapsed;
			if(this.boardPlayerPositions[i] > this.playerPositions[i]) // overshot the change -- make them equal
				this.boardPlayerPositions[i] = this.playerPositions[i];
		} else if(this.boardPlayerPositions[i] > this.playerPositions[i]) {
			this.boardPlayerPositions[i] -= this.basePaddleVelocity * CATCH_UP_MODIFIER * secondsElapsed;
			if(this.boardPlayerPositions[i] < this.playerPositions[i]) // overshot the change -- make them equal
				this.boardPlayerPositions[i] = this.playerPositions[i];
		}
	}
}
