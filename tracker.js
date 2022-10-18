'use-strict';

// look back into practice.js for explanation comments.

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;
const crypto = require('crypto'); // we will use crypto module to create a random 32-bit integer.

module.exports.getPeers = (torrent, callback) => {
	const socket = dgram.createSocket('udp4');
	
	const url = torrent.announce.toString('utf8');
	
	udpSend(socket, buildConnReq(), url);
	
	socket.on('message', response => {
		if (respType(response) === 'connect') {
			// 2. receive and parse connect response
			const connResp = parseConnResp(response);
			// 3. send announce request
			const announceReq = buildAnnounceReq(connResp.connectionId);
			udpSend(socket, announceReq, url);
		  } else if (respType(response) === 'announce') {
			// 4. parse announce response
			const announceResp = parseAnnounceResp(response);
			// 5. pass peers to callback
			callback(announceResp.peers);
		  }
	});
};

function udpSend(socket, message, rawUrl, callback=()=>{}) { // convenience function to avoid having to set offset and length args.
															// since we want to send the whole buffer and sets a default callback
															// function which is just a empty function, since we dont need to do anything
															// after sending the message.
	const url = urlParse(rawUrl);
	socket.send(message, 0, message.length, url.port, url.host, callback);
}

function buildConnReq() { // Creates the message to be sent
	const bufferMessage = Buffer.alloc(16) // Allocates a new Buffer of size bytes. If fill is undefined, theBuffer will be zero-filled.
								// we know that the message should be 16-bytes long.

	// connection_id -> see notebook for more information.
	bufferMessage.writeUInt32BE(0x417, 0); 
	bufferMessage.writeUInt32BE(0x27101980, 4);
		// Here we write the connection_id, which should always be 0x41727101980 when writing the connection request.
		// We use the method writeUInt32BE which writes an unsigned 32-bit integer in big-endian format. 
		// We pass the number 0x417 and an offset value of 0. And then again the number 0x27101980 at an offset of 4 bytes.
		// The reason we have to write in 4 byte chunks, is that there is no method to write a 64 bit int.
		// So we write 64-bit hexadecimal number as a combination of two 32-bit hexadeciaml numbers.
	
	// action -> -||-
	bufferMessage.writeUInt32BE(0, 8);
		// Here we write 0 for the action into the next 4 bytes, setting the offset at 8-bytes since we just wrote an 8 byte integer
		// This value should always be 0 for the connection request.
	
	// transaction_id -> -||-
	crypto.randomBytes(4).copy(bufferMessage, 12);
		// For the final 4 bytes we genereate a random 4-byte buffer (creates a random 32-bit integer)
		// To copy that buffer into our original buffer we use the copy method passing in the offset we would like to start writing at.
		
	return bufferMessage;
}

function parseConnResp(resp) {
	return {
	  action: resp.readUInt32BE(0), // passing the offset as parameter
	  transactionId: resp.readUInt32BE(4), // passing the offset as parameter
	  connectionId: resp.slice(8) // slice to get the last 8 bytes.
	}
}