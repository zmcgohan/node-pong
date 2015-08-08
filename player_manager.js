var getRandomId = require('./utility_functions.js').getRandomId;

/* Represents a single Pong player. */
function Player(playerNum, socket) {
	this.id = getRandomId();
	this.socket = socket;
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

/* Adds a player to the list of Pong players and returns that new Player object. */
PlayerManager.prototype.addPlayer = function(socketId) {
	var newPlayer = new Player(this.onPlayerNum++, socketId);
	this.players.push(newPlayer);
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
