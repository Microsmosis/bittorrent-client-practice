'use strict';

// look back into practice.js for explanation comments.

const fs = require('fs');
const bencode = require('bencode');
const tracker = require('./tracker');
const torrentParser = require('./torrent-parser');

const torrent = torrentParser.open('test.torrent');

tracker.getPeers(torrent, peers => {
  console.log('list of peers: ', peers);
});
