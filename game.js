/* Game runs as follows once two players are reached:
 * 	1. Main game variables sent
 * 	2. Countdown started
 * 	3. Set new reference time and start sending time updates between clients
 * 	4. Determine initial ball angle and its path
 * 	5. Send angle and path at 0.5 seconds left of countdown
 * 	6. Determine from client 'bounce' or 'score' updates where ball goes next
 * 	7. Repeat 6 until score
 * 	8. If winning score reached, end game - if not, repeat 2-7
 *
 * NOTE: Ball angle must be between 0 <= ballAngle < 2*Math.PI
 */

var BOARD_SIZE = [ 200, 100 ], // size of board (width x height) -- allows easy scaling
	UPDATE_INTERVAL = 100, // how often clients are to send updates
	POINTS_TO_WIN = 1, // points to win each game
	PADDLE_DIMENSIONS = [ 2, 10 ], // dimensions of each paddle on board
	PADDLE_PADDING = 4, // space between side of board and each paddle
	PADDLE_VELOCITY = 40, // speed at which paddles move
	BALL_RADIUS = 1.5, // radius of ball
	COUNTDOWN_SECONDS = 3.0, // length of countdown in seconds
	BALL_START_VELOCITY = 40, // velocity at which ball starts
	BALL_VELOCITY_STEP = 5, // step size at each bounce of ball velocity
	//BALL_START_ANGLES = [ Math.PI/6, 2*Math.PI - Math.PI / 6, Math.PI - Math.PI/6, Math.PI + Math.PI/6 ]; // possible angles at which ball starts for each round
	BALL_START_ANGLES = [ 0, Math.PI ];

var getRandomId = require('./utility_functions.js').getRandomId;

/* Represents a single Pong game. */
function Game() {
	this.players = [];
	this.playerScores = [ 0, 0 ];
	this.playerScoreUpdate = [ 0, 0 ];
	this.playerPositions = [ 50, 50 ];
	this.playerVelocities = [ 0, 0 ];
	this.ballPos = [ 100, 50 ];
	this.ballVelocity = BALL_START_VELOCITY;
	this.ballAngle = null;
}

/* Adds a Player to the Game. */
Game.prototype.addPlayer = function(player) {
	if(this.players.length < 2) 
		this.players.push(player);
	player.game = this;
	this.sendGameDetails(player); // send basic game variables to each player
}

/* Returns the index in players of player. */
Game.prototype.getPlayerI = function(player) {
	for(var i = 0; i < this.players.length; ++i) {
		if(this.players[i] === player) return i;
	}
}

/* Starts the game if it's ready. */
Game.prototype.startIfReady = function() {
	var i;
	if(this.players.length < 2) return;
	console.log('Starting game: ' + this.players[0].name + ' vs. ' + this.players[1].name);
	//this.startRound();
	for(i = 0; i < this.players.length; ++i)
		this.players[i].socket.emit('game-ready', { playerNames: [ this.players[0].name, this.players[1].name ], playerI: i });
	this.startRound();
}

/* Sends the variable details of each game to its players. (Ball radius, board size, etc.) */
Game.prototype.sendGameDetails = function(player) {
	var i;
	var data = {
		countdownLength: COUNTDOWN_SECONDS,
		updateInterval: UPDATE_INTERVAL,
		boardSize: BOARD_SIZE,
		basePaddleVelocity: PADDLE_VELOCITY,
		paddleDimensions: PADDLE_DIMENSIONS,
		paddlePadding: PADDLE_PADDING,
		ballRadius: BALL_RADIUS,
		ballStartVelocity: BALL_START_VELOCITY,
		ballVelocityStep: BALL_VELOCITY_STEP
	};
	player.socket.emit('game-details', data);
}

/* Handles a disconnected event from a player. Stops the game and informs the other player. */
Game.prototype.handleDisconnectedPlayer = function(player) {
	this.players.splice(this.getPlayerI(player), 1);
	if(this.players.length > 0) {
		console.log(player.name + ' quit the game against ' + this.players[0].name);
		this.gameOver = true;
		this.players[0].socket.emit('player-quit-game-end', null);
	}
}

/* Handles a received time update from players. */
Game.prototype.handleTimeUpdate = function(player, time) {
	var otherPlayerI = (this.getPlayerI(player) + 1) % 2;
	if(this.players[otherPlayerI])
		this.players[otherPlayerI].socket.emit('time-update', time);
}

/* Handle a movement update. */
// TODO store starting time to make sure they're not lying about final position
Game.prototype.handleMovementUpdate = function(player, data) {
	var playerI = this.getPlayerI(player),
		otherPlayerI = (playerI + 1) % 2,
		sendData = {};
	if(data.direction === 1) this.playerVelocities[playerI] = PADDLE_VELOCITY;
	else if(data.direction === -1) this.playerVelocities[playerI] = -PADDLE_VELOCITY;
	else if(data.direction === 0) {
		this.playerVelocities[playerI] = 0;
		this.playerPositions[playerI] = data.position;
		sendData.position = data.position;
	}
	sendData.direction = data.direction;
	this.players[otherPlayerI].socket.emit('movement-update', sendData);
}

/* Handles ball bounces. */
Game.prototype.handleBallHit = function(player, data) {
	var playerI = this.getPlayerI(player),
		otherPlayerI = (playerI+1) % 2;
	this.ballVelocity += BALL_VELOCITY_STEP;
	data.velocity = this.ballVelocity;
	this.players[otherPlayerI].socket.emit('ball-hit', data);
}

/* Handles a score. */
var SCORE_WAIT_TIME = 800;
Game.prototype.handleScore = function(player, data) {
	var playerI = this.getPlayerI(player),
		i;
	this.playerScoreUpdate[playerI] = Date.now();
	if(Date.now() - this.playerScoreUpdate[0] < SCORE_WAIT_TIME && Date.now() - this.playerScoreUpdate[1] < SCORE_WAIT_TIME) {
		++this.playerScores[data.player];
		for(i = 0; i < this.players.length; ++i)
			this.players[i].socket.emit('player-scored', { playerScores: this.playerScores });
		if(this.playerScores[data.player] >= POINTS_TO_WIN) {
			this.gameOver = true;
			for(i = 0; i < this.players.length; ++i)
				this.players[i].socket.emit('player-won', { player: data.player });
		} else this.startRound();
	}
}

/* Handles a received game update from players. */
Game.prototype.handleUpdate = function(player, data) {
	console.log('Received update from ' + player.name);
}

/* Starts each round, beginning with a countdown. */
Game.prototype.startRound = function() {
	var i, data;
	data = { ballAngle: BALL_START_ANGLES[Math.floor(Math.random() * BALL_START_ANGLES.length)] };
	for(i = 0; i < this.players.length; ++i)
		this.players[i].socket.emit('round-start', data);
}

exports.Game = Game;
