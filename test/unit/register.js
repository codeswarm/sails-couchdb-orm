/**
 * Test dependencies
 */
var adapter = require('../../');
var registry = require('../../registry');
var assert = require('assert');


describe('registerConnection', function() {

  it('should not hang or encounter any errors', function(done) {
    adapter.registerConnection({
      identity: 'public npm registry',
      adapter: {
        config: {}
      },
      host: 'registry.npmjs.org',
      port: 80
    }, {
      registry: {
        identity: 'registry'
      }
    }, cb);

    function cb(err) {
      if (err) {
        return done(err);
      }

      done();
    }

  });


  // e.g.
  // it('should create a mysql connection pool', function () {})
  // it('should create an HTTP connection pool', function () {})
  // ... and so on.
});
