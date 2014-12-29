angular.module('snapchart.designer.services', [])
  .factory('input', function(mixins, pivot) {
    var input = {
      columns: [],
      data: [],
    };

    input.instantiateColumn = function (c) {
      return { source: c, fn: { name: 'SUM' } };
    };
    input.load = function(data) {
      function getEmptyRows(table) {
        return _(table).map(function (row) {
          return _(row).all(function (x) {
            return _.isNull(x) || x === '';
          });
        }).foldr(function (state, b) {
          return b && !state[1] ? [state[0] + 1, false] : [state[0], true];
        }, [0, false])[0];
      }

      // Look for empty rows at the bottom
      var emptyRows = getEmptyRows(data);
      input.data.length = 0;
      _.merge(input.data, _(data).take(data.length - emptyRows).rest().value());

      // Look for empty columns on the right
      var emptyColumns = getEmptyRows(_(data).transpose());
      var first = input.columns[0] || {};
      _.merge(first, {
        name: 'Variable name',
        type: 'text',
        index: -1,
        variable: true,
      });
      input.columns[0] = first;
      input.columns.length = data[0].length - emptyColumns + 1;
      _(input.columns).rest().forEach(function (c, i) {
        var get = function(d) { return d[i]; };
        var values = _(input.data).map(get);
        var dst = c || {};
        _.merge(dst, {
          name: data[0][i],
          index: i,
          type: pivot.detectType(values),
          get: get,
          tooltip: values.unique().join(', ').substring(0, 100),
        });
        input.columns[i+1] = dst;
      });
    };
    return input;
  })
  .factory('chartTypes', function() {
    function commonValidateFn(data) {
      if (typeof data !== 'object')
        return 'Return value must be an object';
      if (!Array.isArray(data.series))
        return 'Returned object must have a "series" property which is an array';
      if (!_.all(data.series, function(x) { return typeof x === 'string'; }))
        return 'Elements in the "series" array must be strings';
      if (!Array.isArray(data.data))
        return 'Returned object must have a "data" property which is an array';
      if (!_.all(data.data, function(x) { return typeof x === 'object'; }))
        return 'Elements in the "data" array must be objects';
      if (!_.all(data.data, function(x) { return typeof x.x === 'string'; }))
        return 'Objects in the "data" array must have "x" properties of type string';
      if (!_.all(data.data, function(x) { return Array.isArray(x.y); }))
        return 'Objects in the "data" array must have "y" properties which are arrays';
      return '';
    }
    var types = [
      {
        title: 'Bar chart',
        name: 'bars',
        config: { legend: {display: true, position: 'right'} },
        validateFn: commonValidateFn,
        maps: {
          x: {name: "X-axis", config: true},
          y: {name: "Y-axis", config: true, restrict: ['number']},
          color: {name: "Color", config: true},
        },
      },
      {
        title: 'Line chart',
        name: 'lines',
        hasMarkers: true,
        maps: {
          x: {name: "X-axis", config: true},
          y: {name: "Y-axis", config: true, restrict: ['number']},
          color: {name: "Color", config: true},
        },
        hasSettings: true,
      },
      {
        title: 'Sankey chart',
        name: 'sankey',
        config: { legend: {display: true, position: 'right'} },
        validateFn: commonValidateFn,
        maps: {
          x: {name: "Node", config: true, restrict: ['text']},
          y: {name: "Stream", config: true, restrict: ['number']},
          color: {name: "Color", config: true},
        },
      },
      {
        title: 'Pie chart',
        name: 'pie',
        config: { legend: {display: true, position: 'right'} },
        validateFn: commonValidateFn,
        maps: {
          size: {name: "Size", config: false, restrict: ['number']},
          color: {name: "Color", config: true},
          layer: {name: "Layer", config: true, restrict: ['text']},
        },
      },
      {
        title: 'Treemap',
        name: 'treemap',
        config: { },
        validateFn: commonValidateFn,
        maps: {
          size: {name: "Size", config: false, restrict: ['number']},
          color: {name: "Color", config: true},
          text: {name: "Text", config: true},
        },
      },
      /*
      {
        title: 'Point chart',
        name: 'pivot-point',
      },
      {
        title: 'Area chart',
        name: 'pivot-area',
      },*/
    ];
    return {
      get: function() {
        return types;
      },
    };
  });
