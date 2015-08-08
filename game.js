var BOARD_SIZE = [ 200, 100 ],
	COUNTDOWN_SECONDS = 3.0,
	COUNTDOWN_DECREMENT_STEP = 0.2;

var getRandomId = require('./utility_functions.js').getRandomId;

/* Represents a single Pong game. */
function Game() {
	this.players = [];
	this.scores = [ 0, 0 ];
	this.secondsForCountdown = COUNTDOWN_SECONDS; // how long (in seconds) the countdown before a game is
	this.playerPositions = [ BOARD_SIZE[1] / 2 ];
	this.playerPositions.push(this.playerPositions[0]);
	this.ballPos = [ BOARD_SIZE[0] / 2, BOARD_SIZE[1] / 2 ];
	//this.ball = new Ball();
	this.gameCountdown = this.gameCountdown.bind(this);
	this.gameLoop = this.gameLoop.bind(this);
}

/* Adds a Player to the Game. */
Game.prototype.addPlayer = function(player) {
	if(this.players.length < 2) 
		this.players.push(player);
	player.socket.emit('game-request', { success: true });
	this.removeDisconnectedPlayers();
}

/* Removes any disconnected players from the Game.
 *
 * Returns true if any players were disconnected, false otherwise. */
Game.prototype.removeDisconnectedPlayers = function() {
	var i;
	for(i = 0; i < this.players.length; ++i) {
		if(!this.players[i].socket.connected)
			return i;
	}
	return -1;
}

/* Starts the game if it's ready. */
Game.prototype.startIfReady = function() {
	var i, data;
	if(this.players.length < 2) return;
	console.log('Starting game: ' + this.players[0].name + ' vs. ' + this.players[1].name);
	// send message that game's starting
	for(i = 0; i < this.players.length; ++i) {
		this.players[i].socket.emit('countdown-start', { players: [ this.players[0].name, this.players[1].name ] });
	}
	setTimeout(this.gameCountdown, COUNTDOWN_DECREMENT_STEP * 1000);
}

/* Removes a Player from the Game. */
Game.prototype.removePlayer = function(player) {
	var i;
	for(i = 0; i < this.players.length; ++i) {
		if(this.players[i] === player)
			this.players.splice(i, 1);
	}
}

/* Does the countdown for the game, and then starts game loop. */
Game.prototype.gameCountdown = function() {
	var i;
	this.secondsForCountdown -= COUNTDOWN_DECREMENT_STEP;
	if(this.secondsForCountdown > 0) { // countdown time still above 0 -- keep counting down
		for(i = 0; i < this.players.length; ++i) 
			this.players[i].socket.emit('countdown', { secondsLeft: this.secondsForCountdown });
	   	setTimeout(this.gameCountdown, COUNTDOWN_DECREMENT_STEP * 1000);
	} else { // countdown over -- start game
		for(i = 0; i < this.players.length; ++i) 
			this.players[i].socket.emit('game-start', null);
		this.gameLoop(); // countdown over -- start game
	}
}

/* Main game loop. (Called at game start.) */
Game.prototype.gameLoop = function() {
	var data, disconnectedPlayerI, i;
	// check for any disconnected players -- if any have, alert the other
	disconnectedPlayerI = this.removeDisconnectedPlayers();
	if(disconnectedPlayerI !== -1) { // player left the game
		console.log(this.players[disconnectedPlayerI].name + ' quit the game against ' + this.players[(disconnectedPlayerI + 1) % 2].name);
		this.players[0].socket.emit('player-quit-game-end', null);
		return;
	}
	// send game updates
	data = { 
		playerPositions: this.playerPositions,
		ballPos: this.ballPos
	};
	for(i = 0; i < this.players.length; ++i)
		this.players[i].socket.emit('game-update', data);

	setTimeout(this.gameLoop, 50);
}

exports.Game = Game;
