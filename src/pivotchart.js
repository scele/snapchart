angular.module('pivotchart',
  ['pivotchart.controller',
   'pivotchart.directive',
   'ui.bootstrap',
   'ui.codemirror',
   'angularCharts',
  ]).config([
    '$compileProvider',
    function($compileProvider) {
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|data):/);
    }
  ]);
