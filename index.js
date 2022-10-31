'use strict';
const app = require("./app");
// const http = require('http');
const fs = require('fs');
const bencode = require('bencode');
const tracker = require('./src/tracker');
const torrentParser = require('./src/torrent-parser');
const download = require('./src/download');


/* const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer(app); */

// look back into practice.js for explanation comments.


const torrent = torrentParser.open('test.torrent');
download(torrent, torrent.info.name);
// download(torrent); this will be used to download the torrent when file is done


// let listOfPeers; I used this to store all the peers ip and outputted them on the browser

tracker.getPeers(torrent, peers => {
	console.log(peers);
	//listOfPeers = peers
})

app.get('/', (req, res) => {
	res.send('<h1>hello</h1>');
})

app.get('/favicon.ico', (req, res) => {
	res.send('<h1>Too lazy to add a favicon</h1>');
}) 

/* server.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
}); */
  