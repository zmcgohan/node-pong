/* Represents a single Pong game. */
function Game(id) {
	this.id = id || getRandomId();
	this.players = [];
	this.ball = new Ball();
}

/* Adds a Player to the Game. */
Game.prototype.addPlayer = function(player) {
	player.score = 0;
	this.players.push(player);
}

/* Removes a Player from the Game. */
Game.prototype.removePlayer = function(player) {
	var i;
	for(i = 0; i < this.players.length; ++i) {
		if(this.players[i] === player)
			this.players.splice(i, 1);
	}
}
