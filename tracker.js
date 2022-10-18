'use-strict';

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;

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