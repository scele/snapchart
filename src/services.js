angular.module('snapchart', ['snapchart.services', 'snapchart.directives']);
angular.module('snapchart.services', [])
  .factory('snapchart', function (mixins) {
    return {
      variableSeries: function () {
        return {
          source: {
            name: 'Variable name',
            type: 'text',
            index: -1,
            variable: true,
          },
        };
      },
      series: function (i, name) {
        var get = typeof i === 'function' ? i : function (d) { return d[i]; };
        return {
          source: {
            name: name,
            index: i,
            get: get,
          },
        };
      },
      chart: function () {
        var chart = {};
        chart.type = 'bars';
        chart.title = '';
        chart.titleSize = 24;
        chart.fontSize = 13;
        chart.margin = 30;
        chart.showLegend = true;
        chart.showTitle = true;
        chart.background = "rgb(255,255,255)";
        chart.innerRadius = 0;
        chart.vAxis = {
          auto: true,
          type: 'linear', // https://github.com/mbostock/d3/wiki/Scales
                          // (at least 'linear', 'log' and 'ordinal' should work)
          format: 'n', // https://github.com/mbostock/d3/wiki/Formatting
          ticks: 10,
          bands: [] ,
          innerBands: []
        };
        chart.hAxis = {
          auto: true,
          type: 'ordinal',
          format: 'n',
          ticks: 10,
          bands: [],
          innerBands: [],
          showText: [],
          nodeTextPosition: 'over'
        };
        chart.markers = { show: true, size: 3 };
        // https://github.com/mbostock/d3/wiki/SVG-Shapes#line_interpolate
        chart.lineInterpolation = 'linear';
        chart.nodeWidth = 0.2;
        chart.streamThickness = 0.5;
        chart.streamOpacity = 0.7;
        chart.colorScales = [
          {scale: d3.scale.category20c().domain(_.range(20)), primarySpan: 1},
        ];
        chart.font = {family: "Open Sans", weight: 300};
        return chart;
      },
    };
  })
  .factory('mixins', function () {
    // Augment lodash with a transpose function commonly needed
    // in input data transformations.
    function transpose(x) {
      if (!Array.isArray(x) || !Array.isArray(x[0]))
        throw new Error('transpose() can only be applied to an array of arrays');
      return _.range(x[0].length).map(function(i) { return _.map(x, function(e) { return e[i]; }); });
    }
    function call(ff, v) {
      return _.map(ff, function(f) { return f(v); });
    }
    function sum(yy) {
      return _.reduce(yy, function(sum, num) {
        return sum + num;
      }, 0);
    }
    function product(yy) {
      return _.reduce(yy, function(product, num) {
        return product * num;
      }, 1);
    }
    function cartesianProduct(array) {
      return _.reduce(array, function(a, b) {
        return _.flatten(_.map(a, function(x) {
          return _.map(b, function(y) {
            return x.concat([y]);
          });
        }), true);
      }, [ [] ]);
    }
    _.mixin({'transpose': transpose});
    _.mixin({'call': call});
    _.mixin({'cartesianProduct': cartesianProduct});
    _.mixin({'sum': sum}, {chain: false});
    _.mixin({'product': product}, {chain: false});
    return {};
  })
  .factory('input', function(mixins, pivot) {
    var input = {
      columns: [],
      data: [],
    };

    input.instantiateColumn = function (c) {
      return { source: c, fn: { name: 'SUM' } };
    };
    input.load = function(data) {
      function getEmptyRows(table) {
        return _(table).map(function (row) {
          return _(row).all(function (x) {
            return _.isNull(x) || x === '';
          });
        }).foldr(function (state, b) {
          return b && !state[1] ? [state[0] + 1, false] : [state[0], true];
        }, [0, false])[0];
      }

      // Look for empty rows at the bottom
      var emptyRows = getEmptyRows(data);
      input.data.length = 0;
      _.merge(input.data, _(data).take(data.length - emptyRows).rest().value());

      // Look for empty columns on the right
      var emptyColumns = getEmptyRows(_(data).transpose());
      var first = input.columns[0] || {};
      _.merge(first, {
        name: 'Variable name',
        type: 'text',
        index: -1,
        variable: true,
      });
      input.columns[0] = first;
      input.columns.length = data[0].length - emptyColumns + 1;
      _(input.columns).rest().forEach(function (c, i) {
        var get = function(d) { return d[i]; };
        var values = _(input.data).map(get);
        var dst = c || {};
        _.merge(dst, {
          name: data[0][i],
          index: i,
          type: pivot.detectType(values),
          get: get,
          tooltip: values.unique().join(', ').substring(0, 100),
        });
        input.columns[i+1] = dst;
      });
    };
    return input;
  })
  .factory('pivot', function() {
    function detectType(data) {
      if (_(data).all(function(d) { return typeof d === 'number' || d === '' || _.isNull(d); }))
        return 'number';
      if (_(data).all(function(d) { return d instanceof Date; }))
        return 'date';
      return 'text';
    }
    function getMapType(map, data) {
      return map.type ? map.type : detectType(_(input.data).map(map.get));
    }
    function processColors(colormaps, valuemaps, colorscales, data) {
      var colordata = _(colormaps).map(function (col, i) {
        if (col.variable) {
          return _(valuemaps).map('name').unique().value();
        } else {
          return _(data).map(col.get).unique().value();
        }
      }).value();
      var legenddata = _(colordata)
        .cartesianProduct().filter('length').map(function (a) {
          return a.join(" ");
        }).value();
      var color = colorscales[0].scale.copy().domain(legenddata);
      var legenddata2 = _(legenddata).map(function (c) {
        return {
          text: c,
          color: color(c),
        };
      }).value();

      return {
        legenddata: legenddata2,
        colorscale: color,
      };
    }

    function processSingle(colormaps, detailmaps, valuemaps, data, xmapFilter, xmaps) {
      var colordata = _(colormaps).map(function (col, i) {
        if (col.variable) {
          return _(valuemaps).map('name').unique().value();
        } else {
          return _(data).map(col.get).unique().value();
        }
      }).value();
      var detaildata = _(detailmaps).map(function (col, i) {
        if (col.variable) {
          return _(valuemaps).map('name').unique().value();
        } else {
          return _(data).map(col.get).unique().value();
        }
      }).value();

      function barKeys(maps, data, d, yidx) {
        return _(maps).map(function(c, i) {
          if (c.variable) {
            return data[i][yidx];
          } else {
            return c.get(d);
          }
        }).value();
      }
      function barColorKey(d, yidx) {
        return barKeys(colormaps, colordata, d, yidx).join('\n');
      }
      function barDetailKey(d, yidx) {
        return barKeys(detailmaps, detaildata, d, yidx).join('\n');
      }

      var ydata = _([data, valuemaps]).cartesianProduct().value();
      if (xmapFilter) {
        ydata = _(ydata).filter(function (dd) {
          return _(xmaps).all(function (c, i) {
            if (c.variable)
              return dd[1].name == xmapFilter[i];
            else
              return c.get(dd[0]) == xmapFilter[i];
          });
        });
      }

      return _(ydata).map(function (dd) {
        var item = dd[0];
        var valuemap = dd[1];
        var valueidx = _.indexOf(valuemaps, valuemap);
        var detailkey = barDetailKey(item, valueidx);
        var colorkey = barColorKey(item, valueidx);
        return {
          item: item,
          valuemap: valuemap,
          detailkey: detailkey,
          colorkey: colorkey,
          key: colorkey + '\n' + detailkey,
        };
      })
      .groupBy('key')
      .map(function (values, k) {
        var reducedValue = _(values).map(function (d) {
          return d.valuemap.get(d.item);
        }).sum();
        return {
          reduced: values,
          reducedItems: _.map(values, 'item'),
          reducedValuemaps: _(values).map('valuemap').unique().value(),
          reducedValue: reducedValue,
          colorKey: values[0].colorkey,
          colorKeys: values[0].colorkey.split('\n'),
        };
      }).reverse().value();
    }
    return {
      detectType: detectType,
      getMapType: getMapType,
      processSingle: processSingle,
      processColors: processColors,
    };
  });
