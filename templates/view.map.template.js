function(doc) {
  if (
    {{#each attributes}}
      'undefined' != typeof doc['{{.}}']
      {{#unless @last}} && {{/unless}}
    {{/each}}
  ) {
    var keys = [];
    {{#each attributes}}
      if (! Array.isArray(doc['{{.}}'])) keys.push([doc['{{.}}']]);
      else keys.push(doc['{{.}}']);
    {{/each}}

    _emit(keys);
  }

  function _emit(values) {
    var value;
    var broke = false;
    for(var i = 0 ; i < values.length && ! broke; i ++) {
      value = values[i];
      if (Array.isArray(value)) {
        value.forEach(function(value) {
          values[i] = value;
          _emit(values);
        });
        broke = true
      }
    }
    if (! broke) emit(values, doc);
  }

}