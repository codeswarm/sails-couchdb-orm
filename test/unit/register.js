/**
 * Test dependencies
 */
var adapter  = require('../../');
var registry = require('../../registry');
var assert   = require('assert');


describe('registerCollection', function () {

	it('should not hang or encounter any errors', function (done) {
		adapter.registerCollection({
			identity: 'foo',
      adapter: {
        config: {}
      }
		}, cb);

    function cb(err) {
      if (err) throw err;

      assert.ok(registry.db('foo'));

      assert.ok(registry.collection('foo'));

      done();
    }

	});


	// e.g.
	// it('should create a mysql connection pool', function () {})
	// it('should create an HTTP connection pool', function () {})
	// ... and so on.
});