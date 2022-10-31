'use strict';
const fs = require('fs');
const bencode = require('bencode'); // bencode parser. bencode is a data serialization format. 
								// Similar to JSON or XML but with a differernt format.

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;

const torrent = bencode.decode(fs.readFileSync('goat.torrent')); // reading from .torrent file,  used to return a buffer.

const url = urlParse(torrent.announce.toString('utf8')); // use url module's parse method on our tracker url
														// to easily extract different parts of the url
														// like its protocol, hostname. port etc.

const socket = dgram.createSocket('udp4'); // dgram module for udp. Creating a new socket instance.
											// A socket is an object through which network communication can happen
											// We pass the argument ‘udp4’, which means we want to use the normal 
											// 4-byte IPv4 address format (e.g. 127.0.0.1)
											// can apss 'udp6' for newer IPv6 format but is rarely used.
											
const myMsg = Buffer.from('hello?', 'utf8'); // creating a message to send through the socket.
											// must be in the form of a buffer, not a string or a number.

socket.send(myMsg, 0, myMsg.length, url.port, url.host, () => {}); // The socket’s send method is used for sending messages.
																	// 1st Argument is the message as a buffer.
																	// 2nd and 3rd let you send a part of the buffer.
																	// by specifying an offset and length of the buffer
																	// but if youre just sending the whole buffer you can just
																	// set the offset to 0 and the length  === whole length of buffer.
																	// 4th is the port of the receivers url
																	// 5th is the host of the reveivers url
																	// 6th and last is a callback for when the message has sent.

socket.on('message', msg => {
	console.log('message is', msg); // Here we tell the socket how to handle incoming messages
									// Whenever a message comes back through the socket
									// it will be passed to the callback function.
});

console.log(url);// the buffer is then converted into string format with utf-8 encoding scheme.



// HANDSHAKE MESSAGE EXAMPLE !! 
// {
//	handshake: <pstrlen><pstr><reserved><info_hash><peer_id></peer_id>
//
//	pstrlen: string length of <pstr>, as a single raw byte
//	pstr: string identifier of the protocol
//	reserved: eight (8) reserved bytes. All current implementations use all zeroes.
//	peer_id: 20-byte string used as a unique ID for the client.
//
//	In version 1.0 of the BitTorrent protocol, pstrlen = 19, and pstr = "BitTorrent protocol".
// }