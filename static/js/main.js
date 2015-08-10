var AR = 2, // aspect ratio for canvas (makes it not blurry)
	MAX_USERNAME_LENGTH = 15,
	COOKIE_EXPIRATION_DAYS = 365,
	UP_ARROW_KEY = 38, DOWN_ARROW_KEY = 40,
	PING_UPDATE_INTERVAL = 1000;

var canvas, ctx; // main canvas

var io = io(), // socket.io object
	ping, pingTimeout; // ping between server and client

// create main start screen and game objects (they handle all their own stuff)
var startScreen = new StartScreen(),
	game;

var username = getUsernameCookie();

/* Set up the main canvas and its context. */
function setUp() {
	canvas = document.getElementById('mainCanvas');
	ctx = canvas.getContext('2d');
	correctCanvasSize();
}

/* Retrieves ping between client and server every PING_UPDATE_INTERVAL ms. */
var updatePing = (function() {
	var pingStart = null;
	return function() {
		if(pingStart === null) {
			io.emit('ping', null);
			pingStart = (new Date()).getTime();
		} else {
			ping = (new Date()).getTime() - pingStart;
			pingStart = null;
			pingTimeout = setTimeout(updatePing, PING_UPDATE_INTERVAL);
		}
	}
})();

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
		if(game) game.fullUpdate();
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
		updatePing();
	});
	// on disconnection -- error
	io.on('disconnect', function() {
		console.log('Disconnected from server.');
		if(pingTimeout) clearTimeout(pingTimeout);
	});
	// on ping response
	io.on('pong', updatePing);
	// on receiving default username
	io.on('username-request', function(data) {
		username = data.username;
		startScreen.updateUsername();
		if(!/^User \d+$/.test(username)) // not-default username set -- set a cookie for saving username
			setUsernameCookie();
		console.log('Username set to ' + username);
	});
	io.on('game-request', function(data) {
		if(data.success) {
			console.log('Successfully joined game.');
			game = new Game();
		}
	});
	io.on('board-data', function(data) {
		console.log('Received board data.');
		game.updateFromData(data);
		startScreen.hide();
		game.show();
	});
	io.on('round-start', function(data) { // game is starting
		game.countdownLeft = 0;
		console.log('Round started.');
		game.startGame();
	});
	io.on('game-update', function(data) { // current game position updates
		game.updateFromData(data);
		game.fullUpdate();
	});
	io.on('player-quit-game-end', function(data) {
		console.log('Other player quit. Game over.');
	});
}

setUp();
addWindowListeners();
startScreen.show();
