angular.module('snapchart.designer.services', [])
  .factory('chartTypes', function() {
    function commonValidateFn(data) {
      if (typeof data !== 'object')
        return 'Return value must be an object';
      if (!Array.isArray(data.series))
        return 'Returned object must have a "series" property which is an array';
      if (!_.all(data.series, function(x) { return typeof x === 'string'; }))
        return 'Elements in the "series" array must be strings';
      if (!Array.isArray(data.data))
        return 'Returned object must have a "data" property which is an array';
      if (!_.all(data.data, function(x) { return typeof x === 'object'; }))
        return 'Elements in the "data" array must be objects';
      if (!_.all(data.data, function(x) { return typeof x.x === 'string'; }))
        return 'Objects in the "data" array must have "x" properties of type string';
      if (!_.all(data.data, function(x) { return Array.isArray(x.y); }))
        return 'Objects in the "data" array must have "y" properties which are arrays';
      return '';
    }
    var types = [
      {
        title: 'Bar chart',
        name: 'bars',
        type: 'pivot-bars', // XXX Move directive name to registry
        config: { legend: {display: true, position: 'right'} },
        validateFn: commonValidateFn,
        maps: {
          x: {name: "X-axis", config: true},
          y: {name: "Y-axis", config: true, restrict: ['number']},
          color: {name: "Color", config: true},
        },
      },
      {
        title: 'Line chart',
        name: 'lines',
        type: 'pivot-lines',
        hasMarkers: true,
        maps: {
          x: {name: "X-axis", config: true},
          y: {name: "Y-axis", config: true, restrict: ['number']},
          color: {name: "Color", config: true},
        },
        hasSettings: true,
      },
      {
        title: 'Sankey chart',
        name: 'sankey',
        type: 'pivot-sankey',
        config: { legend: {display: true, position: 'right'} },
        validateFn: commonValidateFn,
        maps: {
          x: {name: "Node", config: true, restrict: ['text']},
          y: {name: "Stream", config: true, restrict: ['number']},
          color: {name: "Color", config: true},
        },
      },
      {
        title: 'Pie chart',
        name: 'pie',
        type: 'pivot-pie',
        config: { legend: {display: true, position: 'right'} },
        validateFn: commonValidateFn,
        maps: {
          size: {name: "Size", config: false, restrict: ['number']},
          color: {name: "Color", config: true},
          layer: {name: "Layer", config: true, restrict: ['text']},
        },
      },
      {
        title: 'Treemap',
        name: 'treemap',
        type: 'pivot-treemap',
        config: { },
        validateFn: commonValidateFn,
        maps: {
          size: {name: "Size", config: false, restrict: ['number']},
          color: {name: "Color", config: true},
          text: {name: "Text", config: true},
        },
      },
      /*
      {
        name: 'Point chart',
        type: 'pivot-point',
      },
      {
        name: 'Area chart',
        type: 'pivot-area',
      },*/
    ];
    return {
      get: function() {
        return types;
      },
    };
  });
