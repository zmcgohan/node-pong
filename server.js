var SERVER_PORT = process.argv[2] || 3000;

var express = require('express'),
	app = express(),
	http = require('http').Server(app),
	io = require('socket.io')(http);

// set templating engine to jade for express
app.set('view engine', 'jade');
app.locals.pretty = true; // pretty print HTML
// set static file locations
app.use('/static', express.static('static'));

// request for static files of app
app.get('/', function(req, res) {
	res.render('index');
});

// new user connected to game server
var playerMgr = new (require('./player_manager.js').PlayerManager)(),
	gameMgr = new (require('./game_manager.js').GameManager)();

io.on('connection', function(socket) {
	socket.player = playerMgr.addPlayer(socket); // set player identity to socket
	console.log(socket.player.name + ' connected (Total players: ' + playerMgr.numPlayers + ')');
	// user disconnected from server
	socket.on('disconnect', function() {
		playerMgr.removePlayer(socket.player);
		if(socket.player.game) socket.player.game.handleDisconnectedPlayer(socket.player); // if player is in a game, end it
		console.log(socket.player.name + ' disconnected (Total players remaining: ' + playerMgr.numPlayers + ')');
	});
	// user pinging the server
	socket.on('ping', function() { socket.emit('pong', null); });
	// user requesting new game
	socket.on('game-request', function(data) {
		var isRandomGame = data.id === null;
		if(isRandomGame) console.log('\t' + socket.player.name + ' is requesting a random game');
		else console.log('\t' + socket.player.name + ' is requesting an ID game');
		gameMgr.addPlayerToGame(socket.player, data.id);
	});
	// game time update received
	socket.on('time-update', function(data) {
		if(socket.player.game)
			socket.player.game.handleTimeUpdate(socket.player, data);
	});
	// game movement update received
	socket.on('movement-update', function(data) {
		if(socket.player.game)
			socket.player.game.handleMovementUpdate(socket.player, data);
	});
});

// start server listening
http.listen(SERVER_PORT, function() {
	console.log('Pong server started on port ' + SERVER_PORT);
});
