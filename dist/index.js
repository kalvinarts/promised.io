'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Generates a random unique identifier (12B hex by default)
var genUID = function genUID() {
  var rBytes = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 8;
  var map = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e'];

  var now = new Date().getTime();
  var nowS = ((now - now % 1000) / 1000).toString(16); // 4B timeStamp
  var randA = [];
  for (var c = 0; c < rBytes * 2; c++) {
    randA.push(map[Math.floor(Math.random() * map.length)]);
  }return nowS + randA.join('');
};

var PromisedIO = function () {
  function PromisedIO(emitter) {
    var api = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var debug = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    var _this = this;

    var context = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    var uid = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '__pEmitter';

    _classCallCheck(this, PromisedIO);

    this._emitter = emitter;
    this._debug = debug;
    this._ctx = context;
    this._uid = uid; // We will use this as a namespace for our """"protocol"""" XD
    this._unresolved = [];
    this._events = [];
    this._apiMethods = [];
    // If provided register the API methods
    if (api) this.registerAPI(api);
    // Add a helper for the client to retrieve the
    // available methods list
    this.on('_getAPIMethods', function () {
      return _this._apiMethods;
    });
  }

  // Check if a response listener is registered


  _createClass(PromisedIO, [{
    key: '_listenerIsRegistered',
    value: function _listenerIsRegistered(event) {
      for (i in this._events) {
        if (this._events[i] === event) return true;
      }
      return false;
    }

    // Registers an event to handle its responses

  }, {
    key: '_registerListener',
    value: function _registerListener(event) {
      var _this2 = this;

      this._emitter.on(this._uid + '_R_' + event, function (res) {
        _this2._unresolved = _this2._unresolved.filter(function (call) {
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

  }, {
    key: 'emit',
    value: function emit(event, data) {
      var _this3 = this;

      // If it's not already done, register a handler for the responses of the event
      if (!this._listenerIsRegistered(event)) this._registerListener(event);
      // Return a promise
      return new Promise(function (f, r) {
        // Generate a unique ID for this call
        var uid = genUID();
        // Store the unresolved promise with its UID to keep track on it
        _this3._unresolved.push({
          uid: uid,
          f: f,
          r: r
        });
        // Emit the event with the same UID we stored for the promise
        _this3._emitter.emit(_this3._uid + '_C_' + event, {
          uid: uid,
          data: data
        });
      });
    }

    // Registers an event listener

  }, {
    key: 'on',
    value: function on(event, handler) {
      var _this4 = this;

      // Register an event listener
      this._emitter.on(this._uid + '_C_' + event, function (e) {
        // Helper for resolving handlers that return a Promise
        var resolvePromisedResult = function resolvePromisedResult(result) {
          if (result instanceof Promise || (typeof result === 'undefined' ? 'undefined' : _typeof(result)) === 'object' && typeof result.then === 'function') {
            (function () {
              // Wait for the Promise to be fulfilled or rejected
              var p = result.then(function (res) {
                resolvePromisedResult(res);
              }).catch(function (err) {
                // If debugging is enabled send errors to the other end
                if (_this4._debug) {
                  p.catch(function (err) {
                    _this4._emitter.emit(_this4._uid + '_R_' + event, {
                      uid: e.uid,
                      error: err
                    });
                  });
                } else {
                  throw err;
                }
              });
            })();
          } else {
            // Emit the response back
            _this4._emitter.emit(_this4._uid + '_R_' + event, {
              uid: e.uid,
              data: result
            });
          }
        };
        // If debugging is enabled send errors to the other end
        if (_this4._debug) {
          try {
            // Call the handler and resolve the return if it's a Promise
            resolvePromisedResult(handler(e.data, _this4._ctx));
          } catch (err) {
            _this4._emitter.emit(_this4._uid + '_R_' + event, {
              uid: e.uid,
              error: err
            });
          }
        } else {
          // Call the handler and resolve the return if it's a Promise without handling any errors   
          resolvePromisedResult(handler(e.data, _this4._ctx));
        }
      });
      // Store the method name to this._apiMethods
      var found = false;
      this._apiMethods.forEach(function (method) {
        if (method === event) found = true;
      });
      if (!found) this._apiMethods.push(event);
      // Let chain calls
      return this;
    }

    // Registers a set of functions in batch

  }, {
    key: 'registerAPI',
    value: function registerAPI(obj) {
      var _this5 = this;

      var funcNames = Object.keys(obj);
      funcNames.forEach(function (name) {
        if (typeof obj[name] === 'function') {
          _this5.on(name, obj[name]);
        }
      });
      return this;
    }
  }]);

  return PromisedIO;
}();

exports.default = PromisedIO;
//# sourceMappingURL=index.js.map