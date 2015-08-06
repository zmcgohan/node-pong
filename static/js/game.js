/* Represents a client-sided game. */
function Game() {
	// DOM elements
	this.container = document.getElementById('gameContainer');
	this.ballImg = document.getElementById('ballImg');
	this.scoreTexts = [ document.getElementById('playerOneScore'), document.getElementById('playerTwoScore') ];

	// game variables
	this.playerNames = [];

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
Game.prototype.drawBall = function(x, y) {
	x = window.innerWidth / 2;
	y = window.innerHeight / 2;
	x *= AR;
	y *= AR;
	ctx.drawImage(this.ballImg, x, y);
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
