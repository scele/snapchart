angular.module('pivotchart',
  ['pivotchart.controller',
   'pivotchart.directive',
   'pivotchart.filter',
   'ui.bootstrap',
   'ui.sortable',
   'ui.slider',
   'colorpicker.module',
   'mgcrea.ngStrap.popover',
  ]).config([
    '$compileProvider',
    function($compileProvider) {
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|data):/);
    }
  ]);
