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


/// Value

exports.value = value;

function value(options, isLike) {
  return Object.keys(options).sort().map(function(key) {
    return options[key];
  });
}

exports.likeValue = likeValue;

function likeValue(options) {
  var startKey = [];
  var endKey = [];
  Object.keys(options).sort().forEach(function(key) {
    var value = options[key];
    if ('string' != typeof value) throw new Error('like value must be a string');
    if (value.charAt(value.length - 1) == '%') value = value.substring(0, value.length - 1);
    startKey.push(value);
    endKey.push(value + '\ufff0');
  });

  return {
    startkey: startKey,
    endkey: endKey
  };
}


/// Create

exports.create = createView;

function createView(db, where, cb) {
  var attributes = Object.keys(where).sort().map(fixAttributeName);
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

    //console.log('ABOUT TO INSERT DDOC', ddoc);

    db.insert(ddoc, '_design/views', cb);
  }
}

function fixAttributeName(attrName) {
  if (attrName == 'id') attrName = '_id';
  return attrName;
}
