/* NOTE: Application is small. It's written very procedurally in some areas (which, really, is MUCH easier for refactoring if I need to). Don't judge me pls. */

var AR = 2, // aspect ratio for canvas (makes it not blurry)
	MAX_USERNAME_LENGTH = 15,
	COOKIE_EXPIRATION_DAYS = 365;

var canvas, ctx; // main canvas
var io = io(); // socket.io object

// create main start screen and game objects (they handle all their own stuff)
var startScreen = new StartScreen(),
	game = new Game();
var username = getUsernameCookie();

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

/* Sets a cookie for username -- on return visits, no need to re-enter it. */
function setUsernameCookie() {
	var expireTime = new Date(), expireStr;
	expireTime.setTime(expireTime.getTime() + COOKIE_EXPIRATION_DAYS*24*60*60*1000);
	expireStr = 'expires=' + expireTime.toUTCString();
	document.cookie = 'username=' + username + '; ' + expireStr;
}

/* If the username cookie exists, returns the username. If not, returns null. */
function getUsernameCookie() {
	var cookiePos = document.cookie.indexOf('username=') + 'username='.length,
		endPos;
	if(cookiePos !== -1) {
		endPos = document.cookie.indexOf(';', cookiePos);
		if(endPos === -1) return document.cookie.substring(cookiePos);
		else return document.cookie.substring(cookiePos, endPos);
	} else {
		return null;
	}
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
		requestUsername(username);
	});
	// on disconnection -- error
	io.on('disconnect', function() {
		console.log('Disconnected from server.');
	});
	// on receiving default username
	io.on('username-request', function(data) {
		username = data.username;
		startScreen.updateUsername();
		if(!/^User \d+$/.test(username)) // not-default username set -- set a cookie for saving username
			setUsernameCookie();
		console.log('Username set to ' + username);
	});
	io.on('game-request', function(data) {
		console.log('Received game data');
	});
	io.on('countdown-start', function(data) {
		console.log('Countdown started.');
	});
	io.on('countdown', function(data) { // on receiving current countdown time
	});
	io.on('game-start', function(data) { // game is starting
		console.log('Game started.');
	});
	io.on('game-update', function(data) { // current game position updates
	});
	io.on('player-quit-game-end', function(data) {
		console.log('Other player quit. Game over.');
	});
}

setUp();
addWindowListeners();
startScreen.show();