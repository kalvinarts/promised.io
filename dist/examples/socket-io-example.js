'use strict';

var _index = require('../index.js');

var _index2 = _interopRequireDefault(_index);

var _socket = require('socket.io');

var _socket2 = _interopRequireDefault(_socket);

var _socket3 = require('socket.io-client');

var _socket4 = _interopRequireDefault(_socket3);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Setup a socket.io server
const ioPort = 3131;
const io = (0, _socket2.default)().listen(ioPort);

// Define the API that the server will expose
const apiFuncs = {
  square: num => {
    return num * num;
  },
  sqrt: num => {
    return Math.sqrt(num);
  }
};

// First we wait for connections to the server
io.on('connection', socket => {
  console.log('-- server - connection recieved');

  // When a new connection is recieved we wrap
  // the socket into a PromisedIO instance
  const promisedAPI = new _index2.default(
  // First argument is the event emitter we want to wrap 
  socket,
  // Optionally we can pass the API object as a second argument
  apiFuncs,
  // The third argument is the debug flag
  // If enabled the errors on the server will be thrown to the client
  true,
  // You can also pass a context object that will be passed as a
  // second argument to any event handler
  { foo: 'bar' });

  // Another way to describe our API is to use the .on function on the
  // PromisedIO instance the same way we do to a normal socket from
  // socket.io
  promisedAPI.on('sayHelloTo', name => {
    return `Hello ${ name }!`;
  }).on('testContext', (arg, ctx) => {
    return ctx;
  })
  // The .on method returns the PromisedIO instance
  // so we can chain the calls.
  .on('asyncWait', secs => {
    // Our API functions can return promise, and the client
    // will recieve the result when the promise is fulfilled
    // or rejected.
    return new Promise((f, r) => {
      // As a simple example we simply fulfill the promise after
      // a given number of seconds
      console.log('-- server: waiting', secs, 'seconds');
      setTimeout(() => {
        console.log('-- server: waited', secs, 'seconds');
        f(`Waited for ${ secs } to return this string.`);
      }, secs * 1000);
    });
  });
});

// Now that we have our API defined we can connect to it.

// Setup a socket.io-client
const socket = new _socket4.default(`ws://localhost:${ ioPort }`);

// Now we wrap the socket the same way we did to the server socket
const promisedClient = new _index2.default(socket);

// An we are ready to go! To call methods on the server
// just pass the function name and the argument object to
// .emit method of the PromiseEmitter instance
promisedClient.emit('square', 5).then(result => {
  console.log(`-- client: The sqare method returned ${ result }`);
});

// There is a builtin helper to retrieve the registered methods
// on the other side. We can use it to create a real API objcet 
// of functions to call.
promisedClient.emit('_getAPIMethods').then(methods => {
  let clientAPI = {};

  console.log('-- client: The server exposes the methods:', methods);

  methods.forEach(method => {
    console.log('  -', method);
    clientAPI[method] = argument => promisedClient.emit(method, argument);
  });

  // And now just use it like a regular API which methods return
  // a Promise ;)
  clientAPI.testContext().then(result => {
    console.log('-- client: server context =>', result);
  });

  clientAPI.asyncWait(5).then(result => {
    console.log('-- client: asyncWait method says:', result);
    process.exit(0);
  }).catch(err => {
    console.log('call failed:', err);
    process.exit(1);
  });
}).catch(err => {
  console.log('Something bad happenned...');
  throw err;
});
//# sourceMappingURL=socket-io-example.js.map