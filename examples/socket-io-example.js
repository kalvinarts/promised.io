import PromisedEmitter from '../index.js'
import SocketIO from 'socket.io'
import SocketIOClient from 'socket.io-client'

// Setup a socket.io server
const ioPort = 3131;
const io = SocketIO().listen(ioPort);

// Define the API that the server will expose
const apiFuncs = {
  square: (num) => {
    return num * num;
  },
  sqrt: (num) => {
    return Math.sqrt(num)
  }
}; 

// First we wait for connections to the server
io.on('connection', socket => {
  
  // When a new connection is recieved we wrap
  // the socket into a PromisedEmitter instance
  const promisedAPI = new PromisedEmitter(
    // First argument is the event emitter we want to wrap 
    socket,
    // Optionally we can pass the API object as a second argument
    apiFuncs  
  );

  // Another way to describe our API is to use the .on function on the
  // PromisedEmitter instance the same way we do to a normal socket from
  // socket.io
  promisedAPI
    .on('sayHelloTo', (name) => {
      return `Hello ${name}!`;
    })
    // The .on method returns the PromisedEmitter instance
    // so we can chain the calls.
    .on('asyncWait', secs => {
      // Our API functions can return promise, and the client
      // will recieve the result when the promise is fulfilled
      // or rejected.
      return new Promise((f, r) => {
        // As a simple example we simply fulfill the promise after
        // a given number of seconds
        setTimeout(() => {
          f(`Waited for ${secs} to return this string.`);
        }, secs * 1000);
      })
    });

});

// Now that we have our API defined we can connect to it.

// Setup a socket.io-client
const socket = new SocketIOClient(`ws://localhost:${ioPort}`);

// Now we wrap the socket the same way we did to the server socket
const promisedClient = new PromisedEmitter(socket);

// An we are ready to go! To call methods on the server
// just pass the function name and the argument object to
// .emit method of the PromiseEmitter instance
promisedClient.emit('square', 5).then((result) => {
  console.log(`The sqare method returned ${result}`);
});

// There is a builtin helper to retrieve the registered methods
// on the other side. We can use it to create a real API objcet 
// of functions to call.
let clientAPI = {};
promisedClient.emit('_getAPIMethods', (methods) => {
  
  console.log('The server exposes the methods:', methods);

  methods.forEach((method) => {
    clientAPI[method] = (argument) => {
      promisedEmitter.emit(method, argument);
    };
  });
});

// And now just use it like a regular API which methods return
// a Promise ;)
clientAPI.asyncWait(5).then((result) => {
  console.log('asyncWait method says:', result);
});
