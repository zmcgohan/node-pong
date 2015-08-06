var POSSIBLE_RANDOM_ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456890',
	ID_LENGTH = 32;

/* Returns a random ID of length ID_LENGTH, consisting of characters from POSSIBLE_RANDOM_ID_CHARS. */
exports.getRandomId = function(length) {
	var id = '';
	for(i = 0; i < ID_LENGTH; ++i)
		id += POSSIBLE_RANDOM_ID_CHARS[Math.floor(Math.random() * POSSIBLE_RANDOM_ID_CHARS.length)];
	return id;
}
