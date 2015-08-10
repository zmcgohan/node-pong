var getRandomId = require('./utility_functions.js').getRandomId;

/* Represents a single Pong player. */
function Player(playerNum, socket) {
	this.id = getRandomId();
	this.socket = socket;
	this.game = null; // current game they're in
	this.name = 'User ' + playerNum;
}

/* Manages all players of Pong. */
function PlayerManager() {
	this.players = [];
	this.onPlayerNum = 1;
}

Object.defineProperty(PlayerManager.prototype, 'numPlayers', {
	get: function() { return this.players.length; }
});

/* Adds necessary socket listeners for player events. */
PlayerManager.prototype.addSocketListeners = function(socket) {
	// user is requesting a username
	socket.on('username-request', function(data) {
		if(data && data.username.length > 0) {
			console.log('\t' + socket.player.name + ' changed their name to ' + data.username);
			socket.player.name = data.username;
		}
		socket.emit('username-request', { username: socket.player.name });
	});
}

/* Adds a player to the list of Pong players and returns that new Player object. */
PlayerManager.prototype.addPlayer = function(socket) {
	var newPlayer = new Player(this.onPlayerNum++, socket);
	this.players.push(newPlayer);
	this.addSocketListeners(socket);
	return newPlayer;
}

/* Removes a player from all players. */
PlayerManager.prototype.removePlayer = function(player) {
	var i;
	for(i = 0; i < this.numPlayers; ++i) {
		if(this.players[i] === player) {
			this.players.splice(i, 1);
			break;
		}
	}
	return player;
}

exports.PlayerManager = PlayerManager;
