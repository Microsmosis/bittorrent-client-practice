'use strict';
const app = require("./app");
const http = require('http');
const fs = require('fs');
const bencode = require('bencode');
const tracker = require('./tracker');
const torrentParser = require('./torrent-parser');


const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer(app);

// look back into practice.js for explanation comments.


const torrent = torrentParser.open('test.torrent');
let listOfPeers;

tracker.getPeers(torrent, peers => {
	listOfPeers = peers
})

app.get('/', (req, res) => {
	res.send(`<h1>List of peers in console</h1></br>${listOfPeers.map((peer) => {
		return `<span>ip: ${peer.ip} port: ${peer.port}</span></br>`})}`);
})

app.get('/favicon.ico', (req, res) => {
	res.send('<h1>Too lazy to add a favicon</h1>');
}) 

server.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});
  