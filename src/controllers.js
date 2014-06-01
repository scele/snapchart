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
      y: [],
      x: [],
      color: [],
    };
    $scope.$watch('maps', function() {
      while ($scope.maps.x.length > $scope.chart.hAxis.bands.length) {
        $scope.chart.hAxis.bands.push(0.1);
      }
      while ($scope.maps.x.length > $scope.chart.hAxis.innerBands.length) {
        $scope.chart.hAxis.innerBands.push(0.1);
      }
    }, true);
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
      stretchH: 'all',
      minRows: 5,
      minCols: 4,
      enterBeginsEditing: false,
    };
    $scope.$watch('tableInput', function() {
      input.load($scope.tableInput);
    }, true);
    input.load($scope.tableInput);
    $scope.inputArg = input.data;
    $scope.columns = input.columns;

    // Put up a sample graph
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
    $scope.arc = function (r0, r1, a0, a1) {
      return d3.svg.arc()
        .innerRadius(r0)
        .outerRadius(r1)({startAngle: a0, endAngle: a1});
    };

    $scope.$watch(function () {
      var fmt = _.curry(function (showTitle, c) {
        var fmt = c.source.type == 'text' ? 's' : 'f';
        var title = showTitle && c.source.type == 'number' ? (c.source.name + ': ') : '';
        return title + '%(' + c.source.name + ')' + fmt;
      });
      if (!$scope.maps.text.customFormat) {
        if ($scope.maps.text.length == 1) {
          $scope.maps.text.format = fmt(false, $scope.maps.text[0]);
        } else {
          $scope.maps.text.format = _($scope.maps.text).map(fmt(true)).join('\n');
        }
      }
    });

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
      var url;
      try {
        // This will fail on most browsers
        // http://stackoverflow.com/questions/8158312/rasterizing-an-in-document-svg-to-canvas
        ctx.drawImage(img, 0, 0);
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
    $scope.chart.vAxis = { auto: true, type: 'linear', format: 'n', ticks: 10, bands: [] , innerBands: []};
    $scope.chart.hAxis = { auto: true, type: 'ordinal', format: 'n', ticks: 10, bands: [], innerBands: []};
    $scope.chart.markers = { show: true, size: 3 };
    $scope.chart.lineInterpolation = 'linear';
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
