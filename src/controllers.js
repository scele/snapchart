angular.module('pivotchart.controller', ['pivotchart.service'])
  .controller('MainCtrl', function($scope, chartTypes, charts, $modal, $http, $timeout, $window) {
    $scope.charts = charts.get();
    $scope.chartTypes = chartTypes.get();
    $scope.addChart = function(type) {
      $scope.chart.type = type.type;
    };
    $scope.width = 525;
    $scope.height = 376;

    $scope.saveAs = function(event) {
      // Put SVG to img element
      var img = new Image();
      img.width = $scope.width;
      img.height = $scope.height;
      var data = $('.chart-inner svg');
      var xml = (new XMLSerializer()).serializeToString(data.get(0));
      img.src =  'data:image/svg+xml;charset=utf-8,' + xml;
      //var data = $('.chart-inner > .chart > .ac-chart').html();
      //img.src 'data:image/svg+xml;base64,' + btoa(data);

      // Draw img element to canvas
      var canvas = document.createElement('canvas');
      canvas.width = $scope.width;
      canvas.height = $scope.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Get data url from canvas
      var url = canvas.toDataURL('image/png');
      event.target.parentElement.href = url;
    };

    $scope.validateFn = function(f) {
      var data;
      try {
        data = f.apply({}, [$scope.chart.inputArg]);
      } catch (e) {
        return e.message;
      }
      return $scope.chart.validateFn(data);
    };

    $scope.$watch(function() {
      var newValue;
      var chart = $scope.chart;
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
    });

    $scope.inputArg = [
      ["", "Category 1", "Category 2"],
      ["Sales", 54, 150],
      ["Income", 110, 499],
      ["Expense", 879, 79],
    ];
    $scope.chart = angular.copy($scope.chartTypes[0]);
    $scope.chart.inputArg = $scope.inputArg;
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
