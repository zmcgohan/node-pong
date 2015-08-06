/* NOTE: Application is small. It's written very procedurally in some areas (which, really, is MUCH easier for refactoring if I need to). Don't judge me pls. */

var AR = 2, // aspect ratio for canvas (makes it not blurry)
	MAX_USERNAME_LENGTH = 15;

var canvas, ctx; // main canvas
var io = io(); // socket.io object

// create main start screen and game objects (they handle all their own stuff)
var startScreen = new StartScreen(),
	game = new Game();
var username = null;

/* Set up the main canvas and its context. */
function setUp() {
	canvas = document.getElementById('mainCanvas');
	ctx = canvas.getContext('2d');
	correctCanvasSize();
}

/* Sizes the main canvas correctly. */
function correctCanvasSize() {
	canvas.style.width = window.innerWidth + 'px';
	canvas.style.height = window.innerHeight + 'px';
	canvas.width = window.innerWidth * AR;
	canvas.height = window.innerHeight * AR;
}

/* Requests a new username. */
function requestUsername(username) {
	data = username !== undefined ? { username: username } : null;
	//if(data) console.log('Sending request to change username to "' + data.username + '."');
	io.emit('username-request', data);
}

/* Requests a new game. If id is set, it's a game against a friend - if not, random game. */
function requestGame(id) {
	id = id !== undefined ? id : null;
	data = { id: id };
	io.emit('game-request', data);
}

/* Adds main window event listeners. */
function addWindowListeners() {
	// when page resized, update page accordingly
	window.onresize = function() {
		correctCanvasSize();
	}
	/* TODO figure out how to make it always line up correctly in Safari
	// cancel any scrolls (esp. mobile -- Safari at least adds a bar which messes with screen size)
	var preventDefault = function(e) { e.preventDefault(); };
	window.onwheel = preventDefault;
	window.ontouchmove = preventDefault;
	*/
	// on connection, receive username
	io.on('connect', function() {
		console.log('Connected to server.');
		requestUsername();
	});
	// on disconnection -- error
	io.on('disconnect', function() {
		console.log('Disconnected from server.');
	});
	// on receiving default username
	io.on('username-request', function(data) {
		username = data.username;
		startScreen.updateUsername();
		console.log('Username set to ' + username);
	});
	io.on('game-request', function(data) {
		console.log('Received game data');
	});
}

setUp();
addWindowListeners();
startScreen.show();
