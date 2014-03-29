angular.module('pivotchart.service', [])
  .factory('chartTypes', function() {
    var types = [
      {
        name: 'Bar chart',
        type: 'bar',
        config: {},
        fn:
function(data) {
  return {
    series: [
      "Sales",
      "Income",
      "Expense"
    ],
    data: [
      {
        x: "Computers",
        y: [
          54,
          0,
          879
        ],
        tooltip: "This is a tooltip"
      }
    ]
  };
},
      },
      {
        name: 'Pie chart',
        type: 'pie',
        config: {},
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
