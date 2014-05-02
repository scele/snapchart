angular.module('pivotchart',
  ['pivotchart.controller',
   'pivotchart.directive',
   'ui.bootstrap',
   'angularCharts',
   'colorpicker.module',
  ]).config([
    '$compileProvider',
    function($compileProvider) {
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|data):/);
    }
  ]);
