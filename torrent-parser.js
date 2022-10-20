'use-strict';

const fs = require('fs');
const bencode = require('bencode');
const crypto = require('crypto');

module.exports.open = (filepath) => {
	return bencode.decode(fs.readFileSync(filepath));
};

module.exports.infoHash = (torrent) => {
	const info = bencode.encode(torrent.info);
	return crypto.createHash('sha1').update(info).digest(); // !maybe break this down and console log the braked down methods return value.
}

module.exports.size = (torrent) => {
	const size = torrent.info.files ? // checking if there is multiple files in the torrent. If so doing some  math for that
	torrent.info.files.map(file => file.length).reduce((a, b) => a + b) :
    torrent.info.length;
	
	return bufferToBigInt(toBuffer(size, {size : 8})); // instead of 'bignum' library we are using BigInt and it might not work.
											// remember to be aware of this is problems occur and start debugging from this 
										  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
}

function bufferToBigInt(buffer, start = 0, end = buffer.length) {
	const bufferAsHexString = buffer.slice(start, end).toString("hex");
	return BigInt(`0x${bufferAsHexString}`);
};
