'use strict';

const crypto = require('crypto');

let id = null;

module.exports.generateId = () => {
  if (!id) {
    id = crypto.randomBytes(20);
    Buffer.from('-LT0001-').copy(id, 0);
  }
  return id;
};

// “peer id” is used to uniquely identify your client. 
// I created a new file called util.js to generate an id for me.
// A peer id can basically be any random 20-byte string but most clients follow a convention detailed here. 
// Basically “LT” is the name of my client (luke-torrent), and 0001 is the version number.