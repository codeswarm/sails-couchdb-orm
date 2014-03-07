var fs         = require('fs');
var Handlebars = require('handlebars');
var extend     = require('xtend');

var templates = {
  map: Handlebars.compile(fs.readFileSync(__dirname + '/templates/view.map.template.js', 'utf8'))
}

/// Name

exports.name = viewName;

function viewName(where) {
  return ['by'].concat(Object.keys(where).sort()).join('_');
};


/// Create

exports.create = createView;

function createView(db, where, cb) {
  var attributes = Object.keys(where).sort();
  var map = templates.map({
    attributes: attributes,
    attribute: attributes.length == 1 && attributes[0],
    singleAttribute: attributes.length == 1
  });

  db.get('_design/views', gotDesignDoc);

  function gotDesignDoc(err, ddoc) {
    if (! ddoc) ddoc = {};
    if (! ddoc.views) ddoc.views = {};
    ddoc.views[viewName(where)] = {
      map: map
    };

    console.log('ABOUT TO INSERT DDOC', ddoc);

    db.insert(ddoc, '_design/views', cb);
  }
}