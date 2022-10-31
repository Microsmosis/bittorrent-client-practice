const net = require('net');
const Buffer = require('buffer').Buffer;
const tracker = require('./tracker');
const message = require('./message');
const Pieces = require('./Pieces');
const Queue = require('./Queue');
const fs = require('fs');

module.exports = (torrent, path) => {
	tracker.getPeers(torrent, peers => {
	  const pieces = new Pieces(torrent);
	  const file = fs.openSync(path, 'w');
	  peers.forEach(peer => download(peer, torrent, pieces, file));
	});
};


const download = (peer, torrent, pieces) => {

	const socket = new net.Socket(); // net module used to create a TCP socket.

	socket.on('error', console.log); // maybe could implement try&catch instead of this 

	socket.connect(peer.port, peer.ip , () => { // connection might fail this is why we have the line above to prevent crashing the program.
		socket.write(message.buildHandshake(torrent));
	});
	
	const queue = new Queue(torrent);
	onWholeMsg(socket, msg => msgHandler(msg, socket, pieces, queue));
}



function msgHandler(msg, socket, pieces, queue, torrent, file) {
	if (isHandshake(msg)) {
	  socket.write(message.buildInterested());
	} else {
	  const m = message.parse(msg);
  
	  if (m.id === 0) chokeHandler(socket);
	  if (m.id === 1) unchokeHandler(socket, pieces, queue);
	  if (m.id === 4) haveHandler(socket, pieces, queue, m.payload);
	  if (m.id === 5) bitfieldHandler(socket, pieces, queue, m.payload);
	  if (m.id === 7) pieceHandler(socket, pieces, queue, torrent, file, m.payload);
	}
  }



const isHandshake = (msg) => { // This function checks if the message is a handshake.
	return msg.length === msg.readUInt8(0) + 49 &&
		   msg.toString('utf8', 1) === 'BitTorrent protocol'; // dis some weird thing i have to investigate.. Does it return true/false 
		
		// Basically just checks that it’s the same length as a handshake and has pstr ‘BitTorrent protocol’.
}



const onWholeMsg = (socket, callback) =>{

	let savedBuf = Buffer.alloc(0);
	let handshake = true;

	socket.on('data', responseBuffer =>{

		const msgLen = () => handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4; 
		// this has to be checked later below with ^ buf.length to determine which "slice. function will be used"
		 
		savedBuf = Buffer.concat([savedBuf, responseBuffer]);

		while(savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
			callback(savedBuf.slice(0, msgLen())); // read the info when hovering cursor over slice function, this might have to be modified to more 2022 version lol
			savedBuf = savedBuf.slice(msgLen());
			handshake = false;
		}
	});
	
}



const chokeHandler = (socket)  => {
	socket.end();
}



const unchokeHandler = (socket, pieces, queue) => {
	queue.choked = false;

	requestPiece(socket, pieces, queue);
}



const requestPiece = (socket, pieces, queue) => {
	if (queue.choked) return null;
  
	while (queue.length()) {
	  const pieceBlock = queue.deque();
	  if (pieces.needed(pieceBlock)) {
		socket.write(message.buildRequest(pieceBlock));
		pieces.addRequested(pieceBlock);
		break;
	  }
	}
}


const haveHandler = (socket, pieces, queue, payload) => {
	const pieceIndex = payload.readUInt32BE(0);
	const queueEmpty = queue.length === 0;
	queue.queue(pieceIndex);
	if (queueEmpty) requestPiece(socket, pieces, queue);
}


const bitfieldHandler = (socket, pieces, queue, payload) => {

	const queueEmpty = queue.length === 0;
	payload.forEach((byte, i) => {
	  for (let j = 0; j < 8; j++) {
		if (byte % 2) queue.queue(i * 8 + 7 - j);
		byte = Math.floor(byte / 2);
	  }
	});
	if (queueEmpty) requestPiece(socket, pieces, queue);
}


const pieceHandler = (socket, pieces, queue, torrent, file, pieceResp) => {
	console.log(pieceResp);
	console.log(torrent)
	pieces.addReceived(pieceResp);
  
	const offset = pieceResp.index * torrent.info['piece length'] + pieceResp.begin;
	fs.write(file, pieceResp.block, 0, pieceResp.block.length, offset, () => {});
  
	if (pieces.isDone()) {
	  console.log('DONE!');
	  socket.end();
	  try { fs.closeSync(file); } catch(e) {}
	} else {
	  requestPiece(socket,pieces, queue);
	}
}