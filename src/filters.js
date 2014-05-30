angular.module('pivotchart.filter', [])
  .filter('fmt', function() {
    return function(value, fmt) {
      return d3.format(fmt)(value);
    };
  })
  .filter('percentage', function() {
    return function(value) {
      return sprintf("%d %%", value * 100);
    };
  });
