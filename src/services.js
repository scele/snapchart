angular.module('pivotchart.service', [])
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
        type: 'bar',
        config: { legend: {display: true, position: 'right'} },
        fn:
function(data) {
  return {
    series: _(data).map(_.first).rest(1).value(),
    data: _(data).transpose().rest(1).map(function(x) { return {x: _.first(x), y: _.rest(x)};}).value(),
  };
},
        validateFn: commonValidateFn,
      },
      {
        name: 'Pie chart',
        type: 'pie',
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
        type: 'line',
      },
      {
        name: 'Point chart',
        type: 'point',
      },
      {
        name: 'Area chart',
        type: 'area',
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
