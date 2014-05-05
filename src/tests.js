angular.module('pivotchart.tests', ['pivotchart.directive', 'pivotchart.service'])
  .controller('TestsCtrl', function($scope) {
    function crossMap(ff, xx) {
      return _(ff).map(function (f) {
        return _(xx).map(function (x) {
          return f(x);
        }).value();
      }).value();
    }

    function chart(title) {
      var b = _.cloneDeep(base);
      _.forEach(arguments, function (a) {
        _.merge(b, a);
      });
      b.title = title;
      return b;
    }
    function data(series, x, f) {
      return {
        series: series,
        x: x,
        y: crossMap(f, x)
      };
    }

    var base = {
      title: "Chart title",
      titleSize: 12,
      margin: 30,
      showLegend: true,
      showTitle: true,
      background: "rgba(255,255,255,1)",
      innerRadius: 0,
      vAxis: { auto: true, type: 'linear', format: 'n', ticks: 10 },
      hAxis: { auto: true, type: 'ordinal', format: 'n', ticks: 10, band: 0.1, band2: 0.1 },
      lineInterpolation: 'linear',
      barPlacement: 'adjacent',
    };
    var bars = { type: { type: 'pivot-bars', hasVAxis: true, hasHAxis: true } };
    var pie = { type: { type: 'pivot-pie', hasVAxis: false, hasHAxis: false } };
    var lines = { type: { type: 'pivot-lines', hasVAxis: true, hasHAxis: true } };
    var stacked = { barPlacement: 'stacked' };
    var overlapping = { barPlacement: 'overlapping' };
    var linearX = { hAxis: { type: 'linear' } };
    var ordinalX = { hAxis: { type: 'ordinal' } };
    var smallDomainX = { hAxis: { auto: false, min: -1, max: 1 } };
    var smallDomainY = { vAxis: { auto: false, min: -0.5, max: 0.5 } };

    // Test data
    var trigTen = data(
      ['sin', 'cos'],
      _.range(-5, 5, 1),
      [Math.sin, Math.cos]
    );
    var trigHundred = data(
      ['sin', 'cos'],
      _.range(-5, 5, 0.1),
      [Math.sin, Math.cos]
    );
    var sparse = data(
      ['Series 1', 'Series 2'],
      [-10, 10, 20, 100, 300, 310],
      [Math.sin, Math.cos]
    );

    $scope.data = [
      { title: "sin, cos at (-5:5)", data: trigTen },
      { title: "sin, cos at (-5:.1:5)", data: trigHundred },
      { title: "sparse data", data: sparse },
    ];

    $scope.charts = [
      chart("Linear-X line", lines, linearX),
      chart("Clamp X-domain", lines, linearX, smallDomainX),
      chart("Clamp Y-domain", lines, linearX, smallDomainY),
      chart("Ordinal-X line", lines, ordinalX),
      chart("Ordinal-X bars", bars, ordinalX),
      chart("Ordinal-X stacked bars", bars, stacked, ordinalX),
      chart("Ordinal-X overlapping bars", bars, overlapping, ordinalX),
      //chart(bars, linearX),
      //chart(bars, stacked, linearX),
      chart("Pie", pie),
      chart("Donut", pie, { innerRadius: 0.5 }),
      chart("Formatting", pie, {
        showLegend: false,
        font: { family: 'Arial' },
        titleSize: 30,
        background: 'rgba(128,128,128,1)',
      }),
    ];
    $scope.height = 300;
    $scope.width = 400;
  });
