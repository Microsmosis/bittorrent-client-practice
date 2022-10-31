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
	
	const test = Buffer.alloc(8);
	const bignumb = BigInt(size)
	test.writeBigInt64BE(bignumb, 0);
	
	return test;
}

module.exports.BLOCK_LEN = Math.pow(2, 14);

module.exports.pieceLen = (torrent, pieceIndex) => {
	
  const totalLength = parseInt(Buffer.byteLength(this.size(torrent)), 10); // this fix might work lets see .......
  const pieceLength = torrent.info['piece length'];

  const lastPieceLength = totalLength % pieceLength;
  const lastPieceIndex = Math.floor(totalLength / pieceLength);

  return lastPieceIndex === pieceIndex ? lastPieceLength : pieceLength;
};

module.exports.blocksPerPiece = (torrent, pieceIndex) => {
  const pieceLength = this.pieceLen(torrent, pieceIndex);
  return Math.ceil(pieceLength / this.BLOCK_LEN);
};

module.exports.blockLen = (torrent, pieceIndex, blockIndex) => {
  const pieceLength = this.pieceLen(torrent, pieceIndex);

  const lastPieceLength = pieceLength % this.BLOCK_LEN;
  const lastPieceIndex = Math.floor(pieceLength / this.BLOCK_LEN);

  return blockIndex === lastPieceIndex ? lastPieceLength : this.BLOCK_LEN;
};