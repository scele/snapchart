angular.module('pivotchart.service', [])
  .factory('chartTypes', function() {
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
  }
},
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
