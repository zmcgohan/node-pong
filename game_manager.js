var getRandomId = require('./utility_functions.js').getRandomId;

var Game = require('./game.js').Game;

function GameManager() {
	this.currentRandomId = getRandomId();
	this.games = {};
	this.games[this.currentRandomId] = new Game();
}

GameManager.prototype.addPlayerToGame = function(player, id) {
	var game;
	if(!id) { // no ID given -- random game
		game = this.games[this.currentRandomId];
	} else { // ID'ed game -- if not already created, create it; else join it
		if(!this.games[id]) this.games[id] = new Game();
		game = this.games[id];
	}
	game.addPlayer(player);
	console.log(player.name + ' added to game ID ' + (!id ? this.currentRandomId : id));
	if(!id && game.players.length === 2) { // last random game have enough players? make new one
		this.currentRandomId = getRandomId();
		this.games[this.currentRandomId] = new Game();
	}
	game.startIfReady();
}

exports.GameManager = GameManager;
