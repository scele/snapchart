angular.module('pivotchart.service', [])
  .factory('input', function() {
    var input = {
      columns: [],
      data: [],
    };

    function detectType(data) {
      if (_(data).all(function(d) { return typeof d === 'number' || d === '' || _.isNull(d); }))
        return 'number';
      if (_(data).all(function(d) { return d instanceof Date; }))
        return 'date';
      return 'text';
    }
    input.instantiateColumn = function (c) {
      return { source: c };
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
          type: detectType(values),
          get: get,
          tooltip: values.unique().join(', ').substring(0, 100),
        });
        input.columns[i+1] = dst;
      });
    };
    return input;
  })
  .factory('colors', function() {
    var cc = [
      'steelBlue',
      'rgb(255,153,0)',
      'rgb(220,57,18)',
      'rgb(70,132,238)',
      'rgb(73,66,204)',
      'rgb(0,128,0)'
    ];
    return {
      get: function(i) {
        if(i < cc.length) {
          return cc[i];
        } else {
          var color = 'rgb(' + Math.round(Math.random() * 255) + ',' +
                               Math.round(Math.random() * 255) + ',' +
                               Math.round(Math.random() * 255) + ')';
          cc.push(color);
          return color;
        }
      },
    };
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
        name: 'Bar chart',
        type: 'pivot-bars',
        config: { legend: {display: true, position: 'right'} },
        fn:
function(data) {
  return data;
},
/*function(data) {
  return {
    series: _(data).map(_.first).rest(1).value(),
    x: _(data[0]).rest(1).value(),
    y: _(data).rest(1).map(function(d){return _.rest(d,1); }).transpose().value(),
  };
},*//*
function (data) {
  data = ["sin", "cos"];
  var fns = _.map(data, function(d) { return Math[d]; });
  var domain = _.range(-5, 5 ,.1);
  return {
    series: data,
    x: domain,
    y: fns.map(function (f) {
      return domain.map(function (x) {
        return f(x);
      });
    }),
  };
},*/
        validateFn: commonValidateFn,
        hasVAxis: true,
        hasHAxis: true,
      },
      {
        name: 'Pie chart',
        type: 'pivot-pie',
        config: { legend: {display: true, position: 'right'} },
        fn:
function(data) {
  return {
    data: [
      {
        x: "Category 1",
        y: 54,
      },
      {
        x: "Category 2",
        y: 150,
      }
    ]
  };
},
        validateFn: commonValidateFn,
      },
      {
        name: 'Line chart',
        type: 'pivot-lines',
        hasVAxis: true,
        hasHAxis: true,
        hasMarkers: true,
      },
      {
        name: 'Point chart',
        type: 'pivot-point',
      },
      {
        name: 'Area chart',
        type: 'pivot-area',
      },
    ];
    return {
      get: function() {
        return types;
      },
    };
  })
  .factory('charts', function() {
    var charts = [];
    return {
      get: function() {
        return charts;
      },
      add: function(type) {
        var chart = angular.copy(type);
        charts.push(chart);
      },
      remove: function(chart) {
        var i = charts.indexOf(chart);
        charts.splice(i, 1);
      },
    };
  });
