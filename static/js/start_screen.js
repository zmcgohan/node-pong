function StartScreen() {
	this.container = document.getElementById('startScreenContainer');
	this.usernameText = document.getElementById('usernameText');
	this.usernameChangeButton = document.getElementById('usernameChangeButton');
	this.playRandomButton = document.getElementById('playRandomButton');
	this.playFriendButton = document.getElementById('playFriendButton');
	this.bottomLeftFooter = document.getElementById('bottomLeftFooter');
	this.bottomRightFooter = document.getElementById('bottomRightFooter');
	this.gameIDInputContainer = document.getElementById('gameIDInputContainer');
	this.gameIDInput = document.getElementById('gameIDInput');

	// vertically center
	//this.container.height = this.container.offsetHeight;

	this.addEventListeners();
}

/* Adds event listeners to start screen DOM elements. */
StartScreen.prototype.addEventListeners = function() {
	// start search for a random game
	this.playRandomButton.onclick = (function() {
		requestGame();
	}).bind(this);
	// allow for creation or joining of an ID'ed game
	this.playFriendButton.onclick = (function() {
		this.gameIDInputContainer.style.display = 'block';
		this.gameIDInput.focus();
	}).bind(this);
	// on enter of game ID input, request game
	this.gameIDInput.onkeydown = (function(event) {
		var which = event.which || event.keyCode;
		console.log(which);
		if(event.which === 13) { // enter pressed
			event.preventDefault();
			this.gameIDInputContainer.style.display = 'none';
			requestGame(this.gameIDInput.textContent);
		}
	}).bind(this);
	// allow changing of username
	this.usernameChangeButton.onclick = (function() {
		var selection = window.getSelection(),
			range = document.createRange();
		this.usernameText.contentEditable = true;
		this.usernameText.focus();
		range.selectNodeContents(this.usernameText);
		selection.removeAllRanges();
		selection.addRange(range);
	}).bind(this);
	// defocus from username text and validate its input
	function defocusUsername() {
		var selection = window.getSelection();
		document.activeElement.blur();
		this.usernameText.contentEditable = false;
		selection.removeAllRanges();
		if(this.usernameText.textContent.length === 0) this.usernameText.textContent = username; // no username entered? revert back to what it was
		this.usernameText.textContent = this.usernameText.textContent.trim(); // remove spaces on either side
	}
	// if username in text isn't the same as currently set username, request change from server
	function updateUsername() {
		if(this.usernameText.textContent !== username)
			requestUsername(this.usernameText.textContent);
	}
	// only allow alphanumeric and spaces, only up to length 20
	this.usernameText.onkeydown = (function(event) {
		var BACKSPACE = 8, TAB = 9, ENTER = 13, SPACE = 32, LEFT_ARROW = 37, RIGHT_ARROW = 39;
		var which = event.which || event.keyCode;
		if(which === ENTER || which === TAB) {
			document.activeElement.blur();
		} else if(which !== BACKSPACE && which !== SPACE && which !== LEFT_ARROW && which !== RIGHT_ARROW && !(which >= 65 && which <= 90) && !(which >= 48 && which <= 57)) { // disallowed chars -- stop them
			event.preventDefault();
		} else if(this.usernameText.textContent.length >= MAX_USERNAME_LENGTH && (which === SPACE || (which >= 65 && which <= 90) || (which >= 48 && which <= 57))) { // don't allow more than MAX_USERNAME_LENGTH chars
			event.preventDefault();
		}
	}).bind(this);
	// once blurred, make sure username can't be edited directly again
	this.usernameText.onblur = (function(event) {
		defocusUsername();
		updateUsername();
	}).bind(this);
}

/* Display start screen and clear canvas. */
StartScreen.prototype.show = function() {
	this.container.style.display = 'block';
	this.bottomLeftFooter.style.display = this.bottomRightFooter.style.display = 'block';
	if(game) game.hide();
	ctx.clearRect(0,0,canvas.width,canvas.height);
}

/* Hide start screen. */
StartScreen.prototype.hide = function() {
	this.container.style.display = 'none';
	this.bottomLeftFooter.style.display = this.bottomRightFooter.style.display = 'none';
}

/* Updates the displayed username. */
StartScreen.prototype.updateUsername = function() {
	this.usernameText.textContent = username;
}
