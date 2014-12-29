angular.module('snapchart.designer',
  ['snapchart.designer.directives',
   'snapchart.designer.services',
   'snapchart.designer.filters',
   'snapchart',
   'pivotchart.powerpaste',
   'pivotchart.uidb',
   'ui.bootstrap.accordion',
   'ui.bootstrap.tpls',
   'ui.sortable',
   'ui.slider',
   'colorpicker.module',
   'mgcrea.ngStrap.popover',
   'mgcrea.ngStrap.button',
   'mgcrea.ngStrap.modal',
   'ngSanitize',
  ]).config([
    '$compileProvider',
    function($compileProvider) {
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|data):/);
    }
  ])
  .controller('MainCtrl', function($scope, chartTypes, input, snapchart, $modal, $http, $timeout, $window, $location, powerpaste, uidb) {
    $scope.chartTypes = chartTypes.get();

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
      while ($scope.maps.x.length > $scope.chart.hAxis.showText.length) {
        $scope.chart.hAxis.showText.push(true);
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
    $scope.xmapIsLinear = function (xmap) {
      if (xmap.source.type !== 'number') return false;
      if ($scope.chart.type !== 'lines') return false;
      return xmap === _.last($scope.maps.x);
    };

    $scope.$watch('chart.type', function (t) {
      $scope.chartType = _.find($scope.chartTypes, {name: t});
    });

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

    $scope.chartAsSvg = function (selector) {
      var data = $(selector);
      var header = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
      return header + (new XMLSerializer()).serializeToString(data.get(0));
    };

    /* Rendering SVG to PNG in the browser doesn't work due to
     * security constraints.
    $scope.saveAs = function(event, selector) {
      // SVG XML
      var data = $(selector);
      var xml = (new XMLSerializer()).serializeToString(data.get(0));

      // Canvas
      function createCanvas() {
        var canvas = document.createElement('canvas');
        canvas.width = data.width();
        canvas.height = data.height();
        return canvas;
      }
      var canvas = createCanvas();

      // Put SVG to the canvas
      var img = new Image();
      img.width = data.width();
      img.height = data.height();
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
    */

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
      return $scope.chartType.validateFn(data);
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

    $scope.chart = snapchart.chart();
    $scope.chart.fn = function (d) { return d; };
    $scope.chart.inputArg = $scope.inputArg;
    $scope.chart.title = "Chart title";
    $scope.chart.background = "rgba(255,255,255,1)";
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

    var parts;
    parts = $location.path().match(/ws\/([0-9+])(\/raw)?/);
    if (parts) {
      var integrated = parts[2] != '/raw';
      $scope.datasource = {};
      $scope.datasource.reload = function () {
        powerpaste.load(parts[1], integrated, function(data) {
         $scope.tableInput = data;
        });
      };
      powerpaste.load(parts[1], integrated, function(data, url) {
        $scope.datasource.url = url;
        $scope.tableInput = data;
        $scope.chart.title = "Powerpaste";
        $scope.chart.fontSize = 11;
        $scope.chart.colorScales = [$scope.colorScales[2]];
        input.load($scope.tableInput);
        if (integrated) {
          $scope.maps.x     = [input.instantiateColumn($scope.columns[1]),
                               input.instantiateColumn($scope.columns[0])];
          $scope.maps.y     = [input.instantiateColumn($scope.columns[2]),
                               input.instantiateColumn($scope.columns[3]),
                               input.instantiateColumn($scope.columns[4]),
                               input.instantiateColumn($scope.columns[5])];
          $scope.maps.color = [input.instantiateColumn($scope.columns[0])];
          $scope.maps.size  = [input.instantiateColumn($scope.columns[3]),
                               input.instantiateColumn($scope.columns[5]),
                               input.instantiateColumn($scope.columns[4])];
          $scope.maps.layer = [];
          $scope.maps.text = [];
        } else {
          $scope.chart.type = 'line';
          $scope.maps.x     = [input.instantiateColumn($scope.columns[2])];
          $scope.maps.y     = [input.instantiateColumn($scope.columns[3]),
                               input.instantiateColumn($scope.columns[4]),
                               input.instantiateColumn($scope.columns[5]),
                               input.instantiateColumn($scope.columns[6])];
          $scope.maps.color = [input.instantiateColumn($scope.columns[0])];
          $scope.maps.size  = [input.instantiateColumn($scope.columns[3]),
                               input.instantiateColumn($scope.columns[5]),
                               input.instantiateColumn($scope.columns[4])];
          $scope.maps.layer = [];
          $scope.maps.text = [];
        }
      });
      $scope.showPromo = false;
    }
    parts = $location.host().match(/uidb.*/);
    if (parts) {
      var url = $location.path();
      $scope.datasource = {};
      $scope.datasource.reload = function () {
        uidb.load(url, function(data) {
         $scope.tableInput = data;
        });
      };
      uidb.load(url, function(data, url) {
        $scope.datasource.url = url;
        $scope.tableInput = data;
        $scope.chart.title = "";
        $scope.chart.fontSize = 11;
        $scope.chart.colorScales = [$scope.colorScales[2]];
        input.load($scope.tableInput);

        $scope.maps.x     = [];
        function ith(i) { return function (c) { return c[i]; }; }
        for (var i = 0; i < 7; i++) {
          var dd = _(data).tail().map(ith(i));
          if (dd.uniq().size() != 1)
            $scope.maps.x.push(input.instantiateColumn($scope.columns[i + 1]));
        }

        var view = $location.search().view;
        if (view == 'energy') {
          $scope.maps.y     = [input.instantiateColumn($scope.columns[17]),
                               input.instantiateColumn($scope.columns[18]),
                               input.instantiateColumn($scope.columns[19]),
                               input.instantiateColumn($scope.columns[20])];
        } else if (view == 'bandwidth') {
          $scope.maps.y     = [input.instantiateColumn($scope.columns[14]),
                               input.instantiateColumn($scope.columns[15]),
                               input.instantiateColumn($scope.columns[12]),
                               input.instantiateColumn($scope.columns[13])];
        } else {
          $scope.maps.y     = [input.instantiateColumn($scope.columns[11]),
                               input.instantiateColumn($scope.columns[10]),
                               input.instantiateColumn($scope.columns[9])];
        }
        $scope.maps.color = [input.instantiateColumn($scope.columns[0])];
        $scope.maps.size  = [];
        $scope.maps.layer = [];
        $scope.maps.text = [];
      });
      $scope.showPromo = false;
    }

  });
