angular.module('uidb.filter', ['uidb.service'])
  .filter('fmt', function() {
    return function(value, fmt) {
      return d3.format(fmt)(value);
    };
  });
