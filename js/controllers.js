angular.module('pivotchart.controller', ['pivotchart.service'])
  .controller('MainCtrl', function($scope, chartTypes, charts) {
    $scope.charts = charts.get();
    $scope.chartTypes = chartTypes.get();
    $scope.addChart = function(type) {
      charts.add(type);
    };
    $scope.isCollapsed = false;
    $scope.test = "function() { return 1; }";
    $scope.inputArgs = [10];
  });
