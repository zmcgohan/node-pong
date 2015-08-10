/* Game runs as follows once two players are reached:
 * 	1. Main game variables sent
 * 	2. Start sending periodic updates between clients (time & paddle location)
 * 	3. Countdown started
 * 	4. Determine initial ball angle and its path
 * 	5. Send angle and path at 0.5 seconds left of countdown
 * 	6. Determine from client 'bounce' or 'score' updates where ball goes next
 * 	7. Repeat 6 until score
 * 	8. If winning score reached, end game - if not, repeat 3-7
 */

var BOARD_SIZE = [ 200, 100 ], // size of board (width x height) -- allows easy scaling
	UPDATE_INTERVAL = 50, // how often clients are to send updates
	POINTS_TO_WIN = 7, // points to win each game
	PADDLE_DIMENSIONS = [ 2, 10 ], // dimensions of each paddle on board
	PADDLE_PADDING = 4, // space between side of board and each paddle
	PADDLE_VELOCITY = 40, // speed at which paddles move
	BALL_RADIUS = 1.5, // radius of ball
	COUNTDOWN_SECONDS = 3.0, // length of countdown in seconds
	COUNTDOWN_DECREMENT_STEP = 0.2,
	BALL_START_VELOCITY = 20, // velocity at which ball starts
	BALL_VELOCITY_STEP = 1, // step size at each bounce of ball velocity
	BALL_START_ANGLES = [ Math.PI/6, -Math.PI/6, Math.PI - Math.PI/6, Math.PI + Math.PI/6 ]; // possible angles at which ball starts for each round

var getRandomId = require('./utility_functions.js').getRandomId;

/* Represents a single Pong game. */
function Game() {
	this.lastUpdateTime = null;
	this.players = [];
	this.playerScores = [ 0, 0 ];
	this.countdownLeft = 0; // how long (in seconds) the countdown before a game is
	this.playerPositions = null;
	this.playerVelocities = null;
	this.ballPos = null;
	// set random ball velocity for start of game
	this.ballVelocity = null;
	this.ballAngle = null;
	this.setBoard();
	//this.ball = new Ball();
	this.gameCountdown = this.gameCountdown.bind(this);
	this.gameLoop = this.gameLoop.bind(this);
}

/* Adds a Player to the Game. */
Game.prototype.addPlayer = function(player) {
	if(this.players.length < 2) 
		this.players.push(player);
	player.socket.emit('game-request', { success: true });
	player.game = this;
	this.sendBoardToPlayer(player); // send default board info to player
	this.removeDisconnectedPlayers();
}

/* Adds socket listeners for player events. */
Game.prototype.addSocketListeners = function() {
	var i;
	for(i = 0; i < this.players.length; ++i) {
		this.players[i].socket.on('movement', ((function() {
			var playerI = i;
			return (function(data) {
				if(data.direction === 1) this.playerVelocities[playerI] = PADDLE_VELOCITY;
				else if(data.direction === -1) this.playerVelocities[playerI] = -PADDLE_VELOCITY;
				else if(data.direction === 0) {
				   	this.playerVelocities[playerI] = 0;
					this.playerPositions[playerI] = data.position;
				}
			}).bind(this);
		}).bind(this))());
	}
}

/* Sends the variable details of each game to its players. (Ball radius, board size, etc.) */
Game.prototype.sendGameDetails = function() {
	var data = {
		countdownLength: COUNTDOWN_SECONDS,
		updateInterval: UPDATE_INTERVAL,
		boardSize: BOARD_SIZE,
		basePaddleVelocity: PADDLE_VELOCITY,
		paddleDimensions: PADDLE_DIMENSIONS,
		paddlePadding: PADDLE_PADDING,
		ballRadius: BALL_RADIUS
	};
}

/* Sends all necessary board info to player. (Dimensions, starting scores, etc.) */
Game.prototype.sendBoardToPlayer = function(player) {
	var data, players, playerI;
	players = [ 
		this.players[0] ? this.players[0].name : '...', 
		this.players[1] ? this.players[1].name : '...'
	];
	playerI = this.players[0] === player ? 0 : 1;
	data = {
		countdownLeft: this.countdownLeft,
		players: players,
		playerScores: this.playerScores,
		playerI: playerI,
		boardSize: BOARD_SIZE,
		basePaddleVelocity: PADDLE_VELOCITY,
		paddleDimensions: PADDLE_DIMENSIONS,
		paddlePadding: PADDLE_PADDING,
		ballRadius: BALL_RADIUS,
		playerPositions: this.playerPositions,
		playerVelocities: this.playerVelocities,
		ballPos: this.ballPos,
		ballVelocity: this.ballVelocity,
		ballAngle: this.ballAngle
	};
	player.socket.emit('board-data', data);
}

/* Removes any disconnected players from the Game.
 *
 * Returns true if any players were disconnected, false otherwise. */
Game.prototype.removeDisconnectedPlayers = function() {
	var i, disconnectedPlayer;
	for(i = 0; i < this.players.length; ++i) {
		if(!this.players[i].socket.connected) {
			disconnectedPlayer = this.players[i];
			console.log(disconnectedPlayer.name + ' disconnected from their game.');
			this.players.splice(i, 1);
			return disconnectedPlayer;
		}
	}
	return false;
}

/* Starts the game if it's ready. */
Game.prototype.startIfReady = function() {
	var i;
	if(this.players.length < 2) return;
	console.log('Starting game: ' + this.players[0].name + ' vs. ' + this.players[1].name);
	this.addSocketListeners();
	this.startRound();
	/*
	for(i = 0; i < this.players.length; ++i)
		this.sendBoardToPlayer(this.players[i]);
	setTimeout(this.gameCountdown, COUNTDOWN_DECREMENT_STEP * 1000); // start countdown
	*/
}

/* Starts the next round. */
Game.prototype.startRound = function() {
	this.setBoard();
	this.countdownLeft = COUNTDOWN_SECONDS;
	for(i = 0; i < this.players.length; ++i)
		this.sendBoardToPlayer(this.players[i]);
	setTimeout(this.gameCountdown, COUNTDOWN_DECREMENT_STEP * 1000); // start countdown
}

/* Removes a Player from the Game. */
Game.prototype.removePlayer = function(player) {
	var i;
	for(i = 0; i < this.players.length; ++i) {
		if(this.players[i] === player)
			this.players.splice(i, 1);
	}
}

/* Checks if a player has scored. (If the ball has reached either end of the screen.)
 *
 * If they have, return their player index; if not, return false. */
Game.prototype.playerHasScored = function() {
	if(this.ballPos[0] <= BALL_RADIUS) return 0;
	else if(this.ballPos[0] >= BOARD_SIZE[0] - BALL_RADIUS) return 1;
	return false;
}

/* Sets the board to its default, start-of-round state. */
Game.prototype.setBoard = function() {
	this.playerPositions = [ 50, 50 ];
	this.playerVelocities = [ 0, 0 ];
	this.ballPos = [ BOARD_SIZE[0]/2, BOARD_SIZE[1]/2 ];
	this.ballVelocity = BALL_START_VELOCITY;
	this.ballAngle = BALL_START_ANGLES[Math.floor(Math.random() * BALL_START_ANGLES.length)];
}

/* Does the countdown for the game, and then starts game loop. */
Game.prototype.gameCountdown = function() {
	var i;
	this.countdownLeft -= COUNTDOWN_DECREMENT_STEP;
	if(this.countdownLeft > 0) { // countdown time still above 0 -- keep counting down
		for(i = 0; i < this.players.length; ++i) 
			this.players[i].socket.emit('game-update', { countdownLeft: this.countdownLeft });
	   	setTimeout(this.gameCountdown, COUNTDOWN_DECREMENT_STEP * 1000);
	} else { // countdown over -- start game
		for(i = 0; i < this.players.length; ++i) 
			this.players[i].socket.emit('round-start', null);
		this.lastUpdateTime = (new Date()).getTime();
		this.gameLoop(); // countdown over -- start game
	}
}

/* Updates the positions of the ball and player paddles. Handles collisions if there are any. */
Game.prototype.updatePositions = function(elapsedSeconds) {
	var newBallX = this.ballPos[0] + Math.cos(this.ballAngle) * this.ballVelocity * (BOARD_SIZE[0]/BOARD_SIZE[1]) * elapsedSeconds,
		newBallY = this.ballPos[1] - Math.sin(this.ballAngle) * this.ballVelocity * elapsedSeconds;
	this.ballPos[0] = newBallX;
	this.ballPos[1] = newBallY;
	this.playerPositions[0] += this.playerVelocities[0] * elapsedSeconds;
	this.playerPositions[1] += this.playerVelocities[1] * elapsedSeconds;
}

/* Main game loop. (Called at game start.) */
Game.prototype.gameLoop = function() {
	var data, disconnectedPlayer, i, elapsedSeconds;
	data = {};
	// check for any disconnected players -- if any have, alert the other
	disconnectedPlayer = this.removeDisconnectedPlayers();
	if(disconnectedPlayer !== false) { // player left the game
		console.log(disconnectedPlayer + ' quit the game against ' + this.players[0].name);
		this.players[0].socket.emit('player-quit-game-end', null);
		return;
	}
	// update positions
	elapsedSeconds = ((new Date()).getTime() - this.lastUpdateTime) / 1000;
	this.updatePositions(elapsedSeconds);
	// check if player scored
	var scoringPlayer = this.playerHasScored();
	if(scoringPlayer !== false) {
		//console.log(this.players[scoringPlayer].name + ' scored against ' + this.players[(scoringPlayer+1)%2].name);
		++this.playerScores[scoringPlayer];
		data.playerScores = this.playerScores;
		this.startRound();
		return;
	}
	// send game updates
	data.playerVelocities = this.playerVelocities;
	data.ballPos = this.ballPos;
	data.ballVelocity = this.ballVelocity;
	data.ballAngle = this.ballAngle;
	for(i = 0; i < this.players.length; ++i) {
		// only send the other player's position
		data.playerPositions = [ i === 0 ? null : this.playerPositions[0], i === 1 ? null : this.playerPositions[1] ];
		this.players[i].socket.emit('game-update', data);
	}

	this.lastUpdateTime = (new Date()).getTime(); // update last update time
	setTimeout(this.gameLoop, 50);
}

exports.Game = Game;
