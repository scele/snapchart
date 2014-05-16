angular.module('pivotchart.controller', ['pivotchart.service'])
  .controller('MainCtrl', function($scope, chartTypes, charts, input, $modal, $http, $timeout, $window) {
    $scope.charts = charts.get();
    $scope.chartTypes = chartTypes.get();
    $scope.width = 525;
    $scope.height = 376;

    //$scope.columns = [
    //  { name: 'Column 1', type: 'number' },
    //  { name: 'Column 2', type: 'text' },
    //  { name: 'Column 3', type: 'text' },
    //];
    //$scope.selectedColumns = [
    //  { name: 'Column 3', type: 'text' },
    //];
    //$scope.selectedRows = [
    //  { name: 'Column 3', type: 'text' },
    //];
    //$scope.selectedColors = [
    //  { name: 'Column 1', type: 'number' },
    //];
    $scope.maps = {
      rows: [],
      columns: [],
      colors: [],
    };
    $scope.tableInput = _.transpose([
      ["", "Category 1", "Category 2"],
      ["Sales", 54, 150],
      ["Income", 110, 499],
      ["Expense", 879, 79],
    ]);
    $scope.tableInput = [
      ["Category", "Geography", "Sales", "Profit"],
      ["Category 1", "Europe", 154, 23],
      ["Category 2", "Europe", 150, 30],
      ["Category 1", "America", 110, 4],
      ["Category 2", "America", 499, 99],
      ["Category 1", "Asia", 879, 200],
      ["Category 2", "Asia", 79, 10],
    ];

    $scope.tableConfig = {
      minSpareCols: 1,
      minSpareRows: 1,
    };
    $scope.$watch('tableInput', function() {
      input.load($scope.tableInput);
    }, true);
    $scope.inputArg = input.data;
    $scope.columns = input.columns;

    $scope.scaleTypes = [
      { type: 'linear', name: 'Linear' },
      { type: 'log', name: 'Logarithmic' }
    ];

    $scope.sortableSrc = {
      connectWith: '.data-list',
      helper: 'clone',
      copy: true,
      update: function(event, ui) {
        // If trying to reorder source columns, cancel.
        if (!ui.item.sortable.droptarget.not(event.target).length) {
          ui.item.sortable.cancel();
        }
      },
      start: function(event, ui) {
        // Source columns shouldn't disappear when they are dragged.
        ui.item.show();
      },
      receive: function(e, ui) {
        // Dragging an item from another list to this one will
        // delete the item.
        ui.item.sortable.cancel();
        ui.item.sortable.deleted = true;
      },
    };
    $scope.sortableDst = {
      connectWith: '.data-list',
    };

    $scope.saveAs = function(event, selector) {
      // SVG XML
      var data = $(selector);
      var xml = (new XMLSerializer()).serializeToString(data.get(0));

      // Canvas
      function createCanvas() {
        var canvas = document.createElement('canvas');
        canvas.width = $scope.width;
        canvas.height = $scope.height;
        return canvas;
      }
      var canvas = createCanvas();

      // Put SVG to the canvas
      var img = new Image();
      img.width = $scope.width;
      img.height = $scope.height;
      img.src =  'data:image/svg+xml;charset=utf-8,' + xml;
      //var data = $('.chart-inner > .chart > .ac-chart').html();
      //img.src 'data:image/svg+xml;base64,' + btoa(data);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      var url;
      try {
        // This will fail on most browsers
        // http://stackoverflow.com/questions/8158312/rasterizing-an-in-document-svg-to-canvas
        url = canvas.toDataURL('image/png');
      } catch (ex) {
        canvas = createCanvas();
        canvg(canvas, xml);
        url = canvas.toDataURL('image/png');
      }

      event.target.parentElement.href = url;
    };

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
        newValue = chart.fn ? chart.fn.apply({}, [angular.copy(chart.inputArg)]) : chart._dataCache;
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

    $scope.chart = angular.copy($scope.chartTypes[0]);
    $scope.chart.type = $scope.chartTypes[0];
    $scope.chart.inputArg = $scope.inputArg;
    $scope.chart.title = "Chart title";
    $scope.chart.titleSize = 24;
    $scope.chart.margin = 30;
    $scope.chart.showLegend = true;
    $scope.chart.showTitle = true;
    $scope.chart.background = "rgba(255,255,255,1)";
    $scope.chart.innerRadius = 0;
    $scope.chart.vAxis = { auto: true, type: 'linear', format: 'n', ticks: 10 };
    $scope.chart.hAxis = { auto: true, type: 'ordinal', format: 'n', ticks: 10, band: 0.1, band2: 0.1 };
    $scope.chart.markers = { show: true, size: 3 };
    $scope.chart.lineInterpolation = 'linear';
    $scope.chart.barPlacement = 'adjacent';
    $scope.fonts = [
      {title: "Open Sans Light", family: "'Open Sans',sans-serif", weight: 100},
      {title: "Open Sans", family: "'Open Sans',sans-serif", weight: 400},
      {title: "Open Sans Bold", family: "'Open Sans',sans-serif", weight: 800},
      {title: "Arial", family: "Arial,sans-serif", weight: 400},
      {title: "Helvetica", family: "Helvetica,sans-serif", weight: 400},
      {title: "Times New Roman", family: "'Times New Roman',Times,serif", weight: 400},
      {title: "Courier New", family: "'Courier New',monospace", weight: 400},
    ];
    $scope.chart.font = $scope.fonts[0];
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
