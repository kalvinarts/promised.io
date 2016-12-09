'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
// Generates a random unique identifier (12B hex by default)
const genUID = (rBytes = 8, map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e']) => {
  let now = new Date().getTime();
  let nowS = ((now - now % 1000) / 1000).toString(16); // 4B timeStamp
  let randA = [];
  for (let c = 0; c < rBytes * 2; c++) randA.push(map[Math.floor(Math.random() * map.length)]);
  return nowS + randA.join('');
};

class PromisedEmitter {
  constructor(emitter, api = {}, debug = false, uid = '__pEmitter') {
    this._emitter = emitter;
    this._uid = uid; // We will use this as a namespace for our """"protocol"""" XD
    this._unresolved = [];
    this._events = [];
    this._apiMethods = [];
    // If provided register the API methods
    if (api) this.registerAPI(api);
    // Add a helper for the client to retrieve the
    // available methods list
    this.on('_getAPIMethods', () => {
      return this._apiMethods;
    });
  }

  // Check if a response listener is registered
  _listenerIsRegistered(event) {
    for (i in this._events) {
      if (this._events[i] === event) return true;
    }
    return false;
  }

  // Registers an event to handle its responses
  _registerListener(event) {
    this._emitter.on(this._uid + '_R_' + event, res => {
      this._unresolved = this._unresolved.filter(call => {
        if (call.uid === res.uid) {
          if (res.error) {
            call.r(res.error);
          } else {
            call.f(res.data);
          }
          return false;
        } else {
          return true;
        }
      });
    });
  }

  // Emits an event and returns a promise to handle the response
  emit(event, data) {
    // If it's not already done, register a handler for the responses of the event
    if (!this._listenerIsRegistered(event)) this._registerListener(event);
    // Return a promise
    return new Promise((f, r) => {
      // Generate a unique ID for this call
      let uid = genUID();
      // Store the unresolved promise with its UID to keep track on it
      this._unresolved.push({
        uid: uid,
        f: f,
        r: r
      });
      // Emit the event with the same UID we stored for the promise
      this._emitter.emit(this._uid + '_C_' + event, {
        uid: uid,
        data: data
      });
    });
  }

  // Registers an event listener
  on(event, handler) {
    // Register an event listener
    this._emitter.on(this._uid + '_C_' + event, e => {
      // Helper for resolving handlers that return a Promise
      const resolvePromisedResult = result => {
        if (result instanceof Promise || typeof result === 'object' && typeof result.then === 'function') {
          // Wait for the Promise to be fulfilled or rejected
          let p = result.then(res => {
            resolvePromisedResult(res);
          }).catch(err => {
            // If debugging is enabled send errors to the other end
            if (this._debug) {
              p.catch(err => {
                this._emitter.emit(this._uid + '_R_' + event, {
                  uid: e.uid,
                  error: err
                });
              });
            } else {
              throw err;
            }
          });
        } else {
          // Emit the response back
          this._emitter.emit(this._uid + '_R_' + event, {
            uid: e.uid,
            data: result
          });
        }
      };
      // If debugging is enabled send errors to the other end
      if (this._debug) {
        try {
          // Call the handler and resolve the return if it's a Promise
          resolvePromisedResult(handler(e.data));
        } catch (err) {
          this._emitter.emit(this._uid + '_R_' + event, {
            uid: e.uid,
            error: err
          });
        }
      } else {
        // Call the handler and resolve the return if it's a Promise without handling any errors   
        resolvePromisedResult(handler(e.data));
      }
    });
    // Store the method name to this._apiMethods
    let found = false;
    this._apiMethods.forEach(method => {
      if (method === event) found = true;
    });
    if (!found) this._apiMethods.push(event);
    // Let chain calls
    return this;
  }

  // Registers a set of functions in batch
  registerAPI(obj) {
    let funcNames = Object.keys(obj);
    funcNames.forEach(name => {
      if (typeof obj[name] === 'function') {
        this.on(name, obj[name]);
      }
    });
    return this;
  }
}

exports.default = PromisedEmitter;
//# sourceMappingURL=index.js.map