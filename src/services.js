angular.module('pivotchart.service', [])
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
  return {
    series: _(data).map(_.first).rest(1).value(),
    x: _(data[0]).rest(1).value(),
    y: _(data).rest(1).map(function(d){return _.rest(d,1); }).transpose().value(),
  };
},/*
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
