var _cache = require('memory-cache');

var defaultResponseKeys = ['header', 'body'];

module.exports = function (app, opts) {
  opts = opts || {};

  for (var url in opts) {
    if ('number' === typeof opts[url]) {
      opts[url] = {expire: opts[url]};
    }
    opts[url].get = ('function' === typeof opts[url].get) ? opts[url].get : defaultCacheGet;
    opts[url].set = ('function' === typeof opts[url].set) ? opts[url].set : defaultCacheSet;

    var evtName = (opts[url].prefix || '') + url;
    app.on(evtName, function () {
      _cache.del(url);
    });
  };

  return function *cache(next) {
    var url = this.url;
    var method = this.method;

    if ((method === 'GET') && (url in opts)) {
      var fresh = opts[url].get.call(this, _cache);
      if (fresh) return;

      yield* next;

      if (this.status === 200) {
        opts[url].set.call(this, _cache, opts[url].expire);
      }
    } else {
      yield* next;
    }
  };
};

/**
 * defaultCacheGet
 *
 * @param {Object} cache
 * @return {Boolean}
 * @api private
 */

function defaultCacheGet(cache) {
  var cacheData = cache.get(this.url);
  if (cacheData) {
    for (var key in cacheData) {
      var value = cacheData[key];
      if (key === 'header') {
        for (var header in value) {
          this.set(header, value[header]);
        };
      } else {
        this[key] = value;
      }
    };
    return true;
  }
}

/**
 * defaultCacheSet
 *
 * @param {Object} cache
 * @param {Number} expire
 * @api private
 */

function defaultCacheSet(cache, expire) {
  var response = this.response;
  var _response = {};
  for (var key in response) {
    if (~defaultResponseKeys.indexOf(key)) {
      _response[key] = response[key];
    }
  }
  cache.put(this.url, _response, expire);
}