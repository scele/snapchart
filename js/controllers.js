angular.module('pivotchart.controller', ['pivotchart.service'])
  .controller('MainCtrl', function($scope, chartTypes, charts) {
    $scope.charts = charts.get();
    $scope.chartTypes = chartTypes.get();
    $scope.addChart = function(type) {
      charts.add(type);
    };
    $scope.evalFn = function(chart) {
      return chart.fn.apply({}, chart.inputArgs);
    };
  });
