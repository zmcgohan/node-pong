var SERVER_PORT = 3000;

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
	socket.player = playerMgr.addPlayer(); // set player identity to socket
	console.log(socket.player.name + ' connected (Total players: ' + playerMgr.numPlayers + ')');
	socket.emit('username-set', { username: socket.player.name }); // send player their default username
	socket.on('disconnect', function() {
		playerMgr.removePlayer(socket.player);
		console.log(socket.player.name + ' disconnected (Total players remaining: ' + playerMgr.numPlayers + ')');
	});
	// user is requesting their default username on load
	socket.on('username-request', function(data) {
		if(data && data.username.length > 0) {
			console.log('\t' + socket.player.name + ' changed their name to ' + data.username);
			socket.player.name = data.username;
		}
		socket.emit('username-request', { username: socket.player.name });
	});
	// user requesting new game
	socket.on('game-request', function(data) {
		var isRandomGame = data.id === null;
		if(isRandomGame) {
			console.log('\t' + socket.player.name + ' is requesting a random game');
		} else {
			console.log('\t' + socket.player.name + ' is requesting an ID game');
		}
	});
});

// start server listening
http.listen(SERVER_PORT, function() {
	console.log('Pong server started on port ' + SERVER_PORT);
});
