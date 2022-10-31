'use-strict';

// look back into practice.js for explanation comments.

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;
const crypto = require('crypto'); // we will use crypto module to create a random 32-bit integer.
const util = require('./util'); // importing function to create random id for messages.
const torrentParser = require('./torrent-parser');


module.exports.getPeers = (torrent, callback) => {
	const socket = dgram.createSocket('udp4');
	
	const url = torrent.announce.toString('utf8');
	
	try {
        udpSend(socket, buildConnReq(), url);
    } catch(e){
		console.log('tracker problem : ' + url);
    }
	
	socket.on('message', response => {
		
		if (respType(response) === 'connect') {
			// 2. receive and parse connect response
			const connResp = parseConnResp(response);
			// 3. send announce request
			const announceReq = buildAnnounceReq(connResp.connectionId, torrent); // 'torrent' param is added in 3.3.2 part of tutorial.
			// we will still need to implement the 'torrent-parser'
			// which will be introduced in part 3.3.3 ->.
			try {
				udpSend(socket, announceReq, url);
			} catch(e){
				console.log('announce problem : ' + url);
			}
			
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
	if (url.port == null) {
		url.port = 6881;
    }
	socket.send(message, 0, message.length, url.port, url.hostname, callback);
	
}


function respType(resp) {
	const action = resp.readUInt32BE(0);
	if (action === 0) return 'connect';
	if (action === 1) return 'announce';
}


function buildConnReq() { // Creates the buffer/message to be sent
	const buffer = Buffer.alloc(16) // Allocates a new Buffer of size bytes. If fill is undefined, theBuffer will be zero-filled.
	// we know that the message should be 16-bytes long.
	
	// connection_id -> see notebook for more information.
	buffer.writeUInt32BE(0x417, 0); 
	buffer.writeUInt32BE(0x27101980, 4);
	// Here we write the connection_id, which should always be 0x41727101980 when writing the connection request.
	// We use the method writeUInt32BE which writes an unsigned 32-bit integer in big-endian format. 
	// We pass the number 0x417 and an offset value of 0. And then again the number 0x27101980 at an offset of 4 bytes.
	// The reason we have to write in 4 byte chunks, is that there is no method to write a 64 bit int.
	// So we write 64-bit hexadecimal number as a combination of two 32-bit hexadeciaml numbers.
	
	// action -> -||-
	buffer.writeUInt32BE(0, 8);
		// Here we write 0 for the action into the next 4 bytes, setting the offset at 8-bytes since we just wrote an 8 byte integer
		// This value should always be 0 for the connection request.
	
	// transaction_id -> -||-
	crypto.randomBytes(4).copy(buffer, 12);
		// For the final 4 bytes we genereate a random 4-byte buffer (creates a random 32-bit integer)
		// To copy that buffer into our original buffer we use the copy method passing in the offset we would like to start writing at.
	return buffer;
}


function parseConnResp(resp) { // function to parse the connection response message
	
	return {
		action: resp.readUInt32BE(0), // passing the offset as parameter
		transactionId: resp.readUInt32BE(4), // passing the offset as parameter
		connectionId: resp.slice(8) // slice to get the last 8 bytes.
	}
}


function buildAnnounceReq(connId, torrent, port=6881) { // function to build the announce request message buffer
							// message is built by the example found in BEP.
							// If you look at the BEP for this request it tells you what the offsets should be,
							// you don’t have to count them out yourself

	const buffer = Buffer.allocUnsafe(98); // not pre-filled and may contain information from older buffers. 
													// That is why it is called unsafe. This seems odd. lets get back to it.
	// connection_id
	connId.copy(buffer, 0); // expecting that connId is a buffer. passing it as param to function and copying it into 
									// announce message.
	
	// action
	buffer.writeUInt32BE(1, 8);
	
	// transaction_id
	crypto.randomBytes(4).copy(buffer, 12);
	
	// info_hash
	torrentParser.infoHash(torrent).copy(buffer, 16); // 20-byte SHA1 hash of the info key from the metainfo file.
	
	// peer_id
	util.generateId().copy(buffer, 36); //  Normally an id is set every time the client loads 
												// and should be the same until it’s closed. We’ll we using the id again later.
	
	// downloaded. 64-bit integer allocating 8-bytes
	Buffer.alloc(8).copy(buffer, 56); //  The total amount downloaded since the client sent the ‘started’ event to the tracker in base ten ASCII.
	
	// left
	torrentParser.size(torrent).copy(buffer, 64); // The number of bytes the client till has to download, in base ten ASCII.
	
	// uploaded. 64-bit integer allocating 8-bytes
	Buffer.alloc(8).copy(buffer, 64); // The total amount uploaded since the client sent the ‘started’ event to the tracker in base ten ASCII.
	
	// event
	buffer.writeUInt32BE(0, 80); // If specified, must be one of the following: started, stopped, completed.
	
	// ip_address
	buffer.writeUInt32BE(0, 80); // (optional) The IP address of the client machine, in dotted format.
	
	// key
	crypto.randomBytes(4).copy(buffer, 88); // Allows a client to identify itself if their IP address changes.
	
	// num_want // not using 'UInt', the number is negative so cannot use unsigned.
	buffer.writeInt32BE(-1, 92); // The number of peers the client wishes to receive from the tracker.
	
	// port
	buffer.writeUInt32BE(port, 86);
	
	return buffer;
	
}


function parseAnnounceResp(response) {
	
	var data = {};
    try {
        data.action = response.readUInt32BE(0);
        data.transactionId = response.readUInt32BE(4);
        data.leechers = response.readUInt32BE(8);
        data.seeders = response.readUInt32BE(12);
        data.peers = [];
        response = response.slice(20);
        for (var i = 0; i < response.length; i += 6) {
            data.peers.push({
                ip: response.slice(i, i + 6).slice(0, 4).join('.'),
                port: response.slice(i, i + 6).readUInt16BE(4)
            });
        }
    } catch(e){

    }

    return data;
}


