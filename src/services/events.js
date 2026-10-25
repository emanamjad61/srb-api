// A tiny in-process event bus. Services announce changes here and the
// Socket.IO layer listens, so services never need to know about sockets.
const { EventEmitter } = require('events');

module.exports = new EventEmitter();
