var SERVER_PORT = 3000;

var express = require('express'),
	app = express(),
	http = require('http').Server(app),
	io = require('socket.io')(http);

var numConnected = 0;

// request for static files of app
app.get('/', function(req, res) {
	res.send('Hello world!');
});

// new user connected to game server
io.on('connection', function(socket) {
	console.log('User connected (Total: ' + (++numConnected) + ')');
	socket.on('disconnected', function() {
		console.log('User disconnected (Total left: ' + (--numConnected) + ')');
	});
});

// start server listening
http.listen(SERVER_PORT, function() {
	console.log('Pong server started on port ' + SERVER_PORT);
});
