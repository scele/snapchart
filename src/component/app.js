angular.module('snapchart.component',
  ['pivotchart.directive',
   'pivotchart.filter',
  ])
  .controller('MainCtrl', function($scope, input, snapchart) {

    $scope.tableInput = [
      ["Category", "Geography", "Sales", "Profit"],
      ["Category 1", "Europe", 154, 23],
      ["Category 2", "Europe", 150, 30],
      ["Category 1", "America", 110, 4],
      ["Category 2", "America", 499, 99],
      ["Category 1", "Asia", 879, 200],
      ["Category 2", "Asia", 79, 10],
    ];

    $scope.$watch('tableInput', function() {
      input.load($scope.tableInput);
    }, true);
    input.load($scope.tableInput);
    $scope.data = input.data;
    $scope.columns = input.columns;

    $scope.dataSource = {
      plugin: 'json',
      url: 'http://...',
      transform: function (input) {
        return input;
      },
    };

    // Put up a sample graph
    $scope.maps = {
      x: [snapchart.variableSeries(), snapchart.series(1, "Geography")],
      y: [snapchart.series(2, "Sales"), snapchart.series(3, "Profit")],
      color: [snapchart.series(0, "Category")],
    };

    $scope.chart = {};
    $scope.chart.type = 'bars';
    $scope.chart.title = "Chart title";
    $scope.chart.titleSize = 24;
    $scope.chart.fontSize = 13;
    $scope.chart.margin = 30;
    $scope.chart.showLegend = true;
    $scope.chart.showTitle = true;
    $scope.chart.background = "rgb(255,255,255)";
    $scope.chart.innerRadius = 0;
    $scope.chart.vAxis = {
      auto: true,
      type: 'linear', // https://github.com/mbostock/d3/wiki/Scales
                      // (at least 'linear', 'log' and 'ordinal' should work)
      format: 'n', // https://github.com/mbostock/d3/wiki/Formatting
      ticks: 10,
      bands: [] ,
      innerBands: []
    };
    $scope.chart.hAxis = {
      auto: true,
      type: 'ordinal',
      format: 'n',
      ticks: 10,
      bands: [],
      innerBands: [],
      showText: [],
      nodeTextPosition: 'over'
    };
    $scope.chart.markers = { show: true, size: 3 };
    // https://github.com/mbostock/d3/wiki/SVG-Shapes#line_interpolate
    $scope.chart.lineInterpolation = 'linear';
    $scope.chart.nodeWidth = 0.2;
    $scope.chart.streamThickness = 0.5;
    $scope.chart.streamOpacity = 0.7;
    $scope.chart.colorScales = [
      {scale: d3.scale.category20c().domain(_.range(20)), primarySpan: 4},
    ];
    $scope.chart.font = {family: "Open Sans", weight: 300};
  });
