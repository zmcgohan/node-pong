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
		if(game) game.render();
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
	// received details of game -- doubles as a 'success' for game requests
	io.on('game-details', function(data) {
		console.log('Successfully joined game and received details.');
		game = new Game(data);
		startScreen.hide();
		game.show();
	});
	// two players now in game -- ready to play
	io.on('game-ready', function(data) {
		console.log('Game is ready.');
		game.playerNames = data.playerNames;
		game.playerI = data.playerI;
		game.updateNameTexts();
	});
	// round is starting -- begin countdown 
	io.on('round-start', function(data) {
		console.log('Round started');
		game.startRound(data.ballAngle);
	});
	// received time update from other player
	io.on('time-update', function(time) {
		game.addReceivedTime(time);
	});
	// received new movement data from other player
	io.on('movement-update', function(data) {
		game.handleMovementUpdate(data);
	});
	// received ball hit data
	io.on('ball-hit', function(data) {
		game.handleBallHit(data);
	});
	// received score
	io.on('player-scored', function(data) {
		console.log('Player scored');
		game.playerScores = data.playerScores;
		game.updateScoreTexts();
	});
	// player has won the game
	io.on('player-won', function(data) {
		console.log('Player ' + data.player + ' won');
		game.gameOver = true;
		game.countdownText.style.fontSize = '175%';
		game.countdownText.style.display = 'block';
		game.countdownText.textContent = game.playerNames[data.player] + ' won';
		clearInterval(game.timeUpdateLoop);
		setTimeout(function() {
			game.hide();
			game = null;
			startScreen.show();
		}, 2000);
	});
	// current game position updates
	io.on('game-update', function(data) { 
	});
	io.on('player-quit-game-end', function(data) {
		console.log('Other player quit. Game over.');
		game.gameOver = true;
		game.countdownText.style.fontSize = '175%';
		game.countdownText.style.display = 'block';
		game.countdownText.textContent = game.playerNames[(1+game.playerI)%2] + ' quit';
		clearInterval(game.timeUpdateLoop);
		setTimeout(function() {
			game.hide();
			game = null;
			startScreen.show();
		}, 2000);
	});
}

setUp();
addWindowListeners();
startScreen.show();
