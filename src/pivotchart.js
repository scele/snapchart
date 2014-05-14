angular.module('pivotchart',
  ['pivotchart.controller',
   'pivotchart.directive',
   'ui.bootstrap',
   'ui.sortable',
   'colorpicker.module',
  ]).config([
    '$compileProvider',
    function($compileProvider) {
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|data):/);
    }
  ]);
