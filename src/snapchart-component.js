angular.module('snapchart-component',
  ['pivotchart.directive',
   'pivotchart.filter',
   'ui.bootstrap',
   'ui.sortable',
   'ui.slider',
   'colorpicker.module',
   'ngSanitize',
  ])
  .controller('MainCtrl', function($scope, chartTypes, charts, input) {
    $scope.charts = charts.get();
    $scope.chartTypes = chartTypes.get();
    $scope.width = 525;
    $scope.height = 376;


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
    $scope.maps = {};
    $scope.maps.x     = [input.instantiateColumn($scope.columns[2]),
                         input.instantiateColumn($scope.columns[0])];
    $scope.maps.y     = [input.instantiateColumn($scope.columns[3]),
                         input.instantiateColumn($scope.columns[4])];
    $scope.maps.color = [input.instantiateColumn($scope.columns[1])];
    $scope.maps.size = [input.instantiateColumn($scope.columns[3])];
    $scope.maps.layer = [input.instantiateColumn($scope.columns[2])];
    $scope.maps.text = [input.instantiateColumn($scope.columns[2])];
    $scope.maps.text.customFormat = false;

    $scope.scaleTypes = [
      { type: 'linear', name: 'Linear' },
      { type: 'log', name: 'Logarithmic' }
    ];
    $scope.showPromo = true;

    $scope.lineInterpolationModes = [
      'linear',
      'linear-closed',
      'step',
      'step-before',
      'step-after',
      'basis',
      'basis-open',
      'basis-closed',
      'bundle',
      'cardinal',
      'cardinal-open',
      'cardinal-closed',
      'monotone',
    ];

    $scope.chart = angular.copy($scope.chartTypes[0]);
    $scope.chart.fn = function (d) { return d; };
    $scope.chart.type = $scope.chartTypes[0];
    $scope.chart.inputArg = $scope.inputArg;
    $scope.chart.title = "Chart title";
    $scope.chart.titleSize = 24;
    $scope.chart.fontSize = 13;
    $scope.chart.margin = 30;
    $scope.chart.showLegend = true;
    $scope.chart.showTitle = true;
    $scope.chart.background = "rgba(255,255,255,1)";
    $scope.chart.innerRadius = 0;
    $scope.chart.vAxis = { auto: true, type: 'linear', format: 'n', ticks: 10, bands: [] , innerBands: []};
    $scope.chart.hAxis = { auto: true, type: 'ordinal', format: 'n', ticks: 10, bands: [], innerBands: [], showText: [], nodeTextPosition: 'over'};
    $scope.chart.markers = { show: true, size: 3 };
    $scope.chart.lineInterpolation = 'linear';
    $scope.chart.nodeWidth = 0.2;
    $scope.chart.streamThickness = 0.5;
    $scope.chart.streamOpacity = 0.7;
    $scope.colorScales = [
      {_id: 0, scale: d3.scale.category20c().domain(_.range(20)), primarySpan: 4},
      {_id: 1, scale: d3.scale.category20b().domain(_.range(20)), primarySpan: 4},
      {_id: 2, scale: d3.scale.category20().domain(_.range(20)), primarySpan: 2},
      {_id: 3, scale: d3.scale.category10().domain(_.range(10)), primarySpan: 1},
    ];
    $scope.numberFormats = [
      {format: 'n', text: '12'},
      {format: 'p', text: '%'},
      {format: 'e', text: '10<sup>2</sup>'},
      {format: 's', text: '&mu;'},
    ];
    $scope.chart.colorScales = [$scope.colorScales[0]];
    $scope.fonts = [
      {title: "Open Sans Light", family: "Open Sans", weight: 300},
      {title: "Open Sans", family: "Open Sans", weight: 400},
      {title: "Open Sans Bold", family: "Open Sans", weight: 800},
      {title: "Arial", family: "Arial", weight: 400},
      {title: "Times", family: "Times", weight: 400},
      {title: "Courier", family: "Courier", weight: 400},
    ];
    $scope.$watch('chart', function () {
      $scope.chart.backgroundRgb =
        $scope.chart.background.replace(/rgba\((.*),(.*),(.*),(.*)\)/, 'rgb($1,$2,$3)');
    }, true);
    $scope.chart.font = $scope.fonts[0];
  });
