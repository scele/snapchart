angular.module('snapchart.component',
  ['pivotchart.directive',
   'pivotchart.filter',
  ])
  .controller('MainCtrl', function($scope, snapchart) {

    $scope.data = [
      ["Category 1", "Europe", 154, 23],
      ["Category 2", "Europe", 150, 30],
      ["Category 1", "America", 110, 4],
      ["Category 2", "America", 499, 99],
      ["Category 1", "Asia", 879, 200],
      ["Category 2", "Asia", 79, 10],
    ];

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

    $scope.chart = snapchart.chart();
    $scope.chart.type = 'bars';
    $scope.chart.title = 'Chart title';
    $scope.chart.font = {family: "Open Sans", weight: 300};
  });
