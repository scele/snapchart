angular.module('pivotchart.controller', ['pivotchart.service'])
  .controller('MainCtrl', function($scope, chartTypes, charts, $modal, $http, $timeout, $window) {
    $scope.charts = charts.get();
    $scope.chartTypes = chartTypes.get();
    $scope.addChart = function(type) {
      type.inputArg = $scope.inputArg;
      charts.add(type);
    };
    $scope.evalFn = function(chart) {
      var newValue;
      try {
        newValue = chart.fn ? chart.fn.apply({}, [chart.inputArg]) : chart._dataCache;
      } catch(e) {
          chart._dataCache = undefined;
          chart._dataCacheStr = "";
          return;
      }
      if (!angular.equals(newValue, chart._dataCache)) {
        chart._dataCache = newValue;
        chart._dataCacheStr = JSON.stringify(newValue, null, "  ");
      }
      return chart._dataCache;
    };
    $scope.inputArg = [
      ["", "Category 1", "Category 2"],
      ["Sales", 54, 150],
      ["Income", 110, 499],
      ["Expense", 879, 79],
    ];
    $scope.import = function(chart) {
      var ModalInstanceCtrl = function ($scope, $modalInstance) {
        $scope.data = { url: "http://" };
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
        $scope.ok = function () {
          $http.get($scope.data.url).success(function(data) {
            $modalInstance.dismiss('ok');
            chart.inputArg = data;
            chart.url = $scope.data.url;
          }).error(function(data, status, headers, config) {
            $scope.error = true;
          });
        };
      };
      var modalInstance = $modal.open({
        templateUrl: 'import.html',
        controller: ModalInstanceCtrl,
        windowClass: 'import',
      });
   };
   $scope.refresh_import = function(chart) {
       $http.get(chart.url).success(function(data) {
           chart.inputArg = data;
       }).error(function(data, status, headers, config) {
           $window.alert("Data refresh failed");
       });
   };

  });
