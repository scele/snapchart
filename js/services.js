angular.module('pivotchart.service', [])
  .factory('chartTypes', function() {
    var types = [
      {
        name: 'Bar chart',
        fn:
function(data) {
  return 1+2;
},
      },
      {
        name: 'Pie chart',
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
        var chart = { type: type, fn: type.fn };
        charts.push(chart);
      },
      remove: function(chart) {
        var i = charts.indexOf(chart);
        charts.splice(i, 1);
      },
    };
  });
