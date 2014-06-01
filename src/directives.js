angular.module('pivotchart.directive', [])
  .factory('pivotUtil', function (colors) {
    function getScale(config, defaultDomain) {
      var axis = d3.scale[config.type]();
      if (config.auto)
        return axis.domain(defaultDomain).nice();
      else
        return axis.domain([config.min, config.max]);
    }
    return {
      getScale: getScale,
      twodChartDirective: function (template) {
        var id = 0;
        return {
          restrict: 'E',
          templateUrl: template,
          replace: true,
          scope: {
            chart: '=',
            data: '=',
            maps: '=',
            width: '=?',
            height: '=?',
          },
          require: '?^graphArea',
          link: function(scope, elm, attrs, graphArea) {
            if (graphArea) {
              graphArea.setGraphArea(scope);
            }
            scope.margin = 50;
            scope.id = id++;
            scope.$watch('[data, maps, chart, width, height]', function() {
              var xmaps = _(scope.maps.x).reject('error').map('source').value();
              var ymaps = _(scope.maps.y).reject('error').map('source').value();
              var colormaps = _(scope.maps.color).reject('error').map('source').value();
              var vAxis = scope.chart.vAxis;
              var hAxis = scope.chart.hAxis;
              scope.innerWidth = scope.width - scope.margin;
              scope.barWidth = scope.innerWidth;
              scope.xdata = _(xmaps).map(function(col, i) {
                if (col.variable) {
                  return _(ymaps).map('name').unique().value();
                } else {
                  return _(scope.data).map(col.get).unique().value();
                }
              }).value();
              scope.colordata = _(colormaps).map(function (col, i) {
                if (col.variable) {
                  return _(ymaps).map('name').unique().value();
                } else {
                  return _(scope.data).map(col.get).unique().value();
                }
              }).value();
              scope.legenddata = _(scope.colordata)
                .cartesianProduct().filter('length').map(function (a) {
                  return a.join(" ");
                }).value();
              scope.color = d3.scale.category20().domain(scope.legenddata);
              if (graphArea) {
                graphArea.setLegendData(_(scope.legenddata).map(function (c) {
                  return {
                    text: c,
                    color: scope.color(c),
                  };
                }).value());
              }

              scope.x = _(xmaps).map(function(col, i) {
                var xdata = scope.xdata[i];
                var band = hAxis.bands ? hAxis.bands[i] : 0.1;
                var innerBand = hAxis.innerBands ? hAxis.innerBands[i] : 0.1;
                if (_.isUndefined(band)) {
                  band = 0.1;
                }
                var x = d3.scale.ordinal()
                  .domain(xdata)
                  .rangeRoundBands([0, scope.barWidth], band, innerBand);
                if (x.rangeBand() === 0) {
                  x.rangeBands([0, scope.barWidth], band, innerBand);
                }
                scope.barWidth = x.rangeBand();
                return x;
              }).value();

              var bars = _(scope.xdata).cartesianProduct().value();

              function barColorKey(d, yidx) {
                return _(colormaps).map(function(c, i) {
                  if (c.variable) {
                    return scope.colordata[i][yidx];
                  } else {
                    return c.get(d);
                  }
                }).join(" ");
              }

              scope.ydata = _(bars).map(function (bar) {
                return _([scope.data, ymaps]).cartesianProduct()
                  //.map(function (dd) { return { d: dd[0], column: dd[1] }; })
                  .filter(function (dd) {
                    return _(xmaps).all(function (c, i) {
                      if (c.variable)
                        return dd[1].name == bar[i];
                      else
                        return c.get(dd[0]) == bar[i];
                    });
                  }).value();
              }).value();
              scope.itemdata = _(scope.ydata).map(function (bar, i) {
                var colors = _(bar).groupBy(function (dd) {
                  return barColorKey(dd[0], _.indexOf(ymaps, dd[1]));
                }).map(function (v, k) {
                  var reducedValue = _(v).map(function (dd) {
                    return dd[1].get(dd[0]);
                  }).sum();
                  return {
                    reduced: v,
                    reducedValue: reducedValue,
                    colorKey: k,
                    barIdx: i
                  };
                }).reverse().value();
                return colors;
              }).flatten().value();

              scope.axisPadding = 30;
              /* Linear scales
                var band = scope.innerWidth/scope.xdata.length;
                var range = d3.extent(scope.xdata);
                if (scope.chart.type.type == 'pivot-bars') {
                  var p = (band / 2) / scope.innerWidth * Math.abs(range[0] - range[1]);
                  range = [range[0] - p, range[1] + p];
                }
                scope.x = getScale(hAxis, range);
                scope.x.range([0, scope.innerWidth]);
                var pad = hAxis.band * band / 2;
                xOffset = -band/2 + pad;
                range0 = [0, band - 2 * pad];
                if (scope.chart.barPlacement == 'adjacent') {
                  domain0 = d3.range(scope.ydata[0].length);
                } else {
                  domain0 = [0];
                }
                scope.x0 = d3.scale.ordinal()
                  .rangeRoundBands(range0, hAxis.band2)
                  .domain(domain0);
                if (scope.x0.rangeBand() == 0) {
                  scope.x0.rangeBands(range0, hAxis.band2);
                }
              }*/
              scope.showAxis = function (axis) {
                var dimension = _.indexOf(scope.x, axis);
                if (dimension == -1)
                  return false;
                return -1 == _(colormaps)
                  .findIndex({ index: xmaps[dimension].index });
              };
              scope.visibleXAxes = _(scope.x).filter(scope.showAxis).value();

              var minY, maxY;
              if (scope.chart.type.type == 'pivot-bars') {
                maxY = _(scope.ydata).map(function (yy) {
                  return _.reduce(yy, function(sum, y) {
                    var num = y[1].get(y[0]);
                    return sum + Math.max(num, 0);
                  }, 0);
                }).max();
                minY = _(scope.ydata).map(function (yy) {
                  return _.reduce(yy, function(sum, y) {
                    var num = y[1].get(y[0]);
                    return sum + Math.min(num, 0);
                  }, 0);
                }).min();
              } else {
                var allY = _(scope.ydata).flatten();
                minY = allY.min();
                maxY = allY.max();
              }
              scope.y = getScale(vAxis, [Math.min(0, minY), Math.max(maxY, 0)])
                .range([scope.height - Math.max(0, (scope.visibleXAxes.length - 1)) *
                                          scope.axisPadding, 10]);
              vAxis.min = scope.y.domain()[0];
              vAxis.max = scope.y.domain()[1];
              //hAxis.min = scope.x.domain()[0];
              //hAxis.max = _.last(scope.x.domain());

              // Bar graphs
              scope.xAxisPositions = function (axis) {
                var dimension = _.indexOf(scope.x, axis);
                return _(scope.x)
                  .take(dimension)
                  .map(function(x, i) { return x.range(); })
                  .cartesianProduct()
                  .map(_.sum)
                  .value();
              };
              scope.barY = function (d, yidx) {
                var y = d.reducedValue;
                var others = _(scope.itemdata)
                  .filter({ barIdx: d.barIdx })
                  .first(function (dd) { return dd !== d; })
                  .map('reducedValue')
                  .filter(function (x) { return x * y >= 0; })
                  .sum();
                return scope.y(Math.max(0, y) + others);
              };
              scope.barX = function (d) {
                return _(scope.x).map(function(x, i) {
                  if (xmaps[i].variable) {
                    return x(d.reduced[0][1].name);
                  } else {
                    return x(xmaps[i].get(d.reduced[0][0]));
                  }
                }).sum();
              };
              scope.barColor = function (d) {
                return scope.color(d.colorKey);
              };
              scope.barHeight = function (d) {
                var zero = Math.min(Math.max(0, vAxis.min), vAxis.max);
                return Math.abs(scope.y(d.reducedValue) - scope.y(zero));
              };

              // Line graphs
              scope.line = d3.svg.line()
                .x(function (d) { return scope.lineX(d.x); })
                .y(function (d) { return scope.y(d.y); })
                .interpolate(scope.chart.lineInterpolation);
              scope.lineX = function (x) {
                if (scope.chart.hAxis.type == 'ordinal') {
                  return scope.x(x) + scope.x.rangeBand() / 2;
                } else {
                  return scope.x(x);
                }
              };

            }, true);
          },
        };
      },
    };
  })
  .directive("resizable", function() {
    return {
      restrict: 'A',
      scope: {
        width: '=',
        height: '=',
      },
      link: function(scope, elm, attrs, ctrl) {
        elm.resizable({
          resize: function(e, ui) {
            scope.$apply(function() {
              scope.width = ui.size.width;
              scope.height = ui.size.height;
            });
          },
        });
      },
    };
  })
  .directive("dynamicDirective", function($parse, $compile) {
    return {
      restrict: 'EA',
      link: function(scope, elm, attrs, ctrl) {
        var s = scope.$new();
        scope.$watch(
          function(scope) {
            return scope.$eval(attrs.dynamicDirective);
          },
          function(newVal, prevVal) {
            var e = angular.element('<' + newVal + '></' + newVal + '>');
            angular.forEach(elm.prop('attributes'), function (a) {
              if (a.name !== 'dynamic-directive') {
                e.attr(a.name, a.textContent);
              }
            });
            elm.html(e);
            s.$destroy();
            s = scope.$new();
            $compile(elm.contents())(s);
          }
        );
      },
    };
  })
  .directive("pivotColumnContainer", function(input) {
    return {
      restrict: 'EA',
      templateUrl: 'src/templates/columnContainer.html',
      replace: true,
      scope: {
        isSource: '=pivotIsSource',
        restrict: '=pivotRestrict',
        name: '@pivotName',
      },
      require: 'ngModel',
      link: function(scope, elm, attrs, ngModel) {
        scope.$watch(function () { return ngModel.$modelValue; }, function () {
          scope.columns = ngModel.$modelValue;
          //if (!scope.isSource) {
          //  for (var i = 0; i < scope.columns.length; i++) {
          //    var c = scope.columns[i];
          //    if (!c.source) {
          //      scope.columns.splice(i, 1, {
          //        source: c,
          //      });
          //    }
          //  };
          //}
        });
        scope.$watch('columns', function () {
          _(scope.columns).each(function (c) {
            if (scope.restrict && !_(scope.restrict).contains(c.source.type)) {
              var types = scope.restrict.join(' and ');
              c.error = scope.name + ' only supports ' + types + ' columns.';
            } else {
              c.error = null;
            }
          });
        }, true);
        scope.sortableSrc = {
          connectWith: '.data-list',
          helper: 'clone',
          copy: true,
          update: function(event, ui) {
            // If trying to reorder source columns, cancel.
            if (!ui.item.sortable.droptarget.not(event.target).length) {
              ui.item.sortable.cancel();
            }
          },
          start: function(event, ui) {
            // Source columns shouldn't disappear when they are dragged.
            ui.item.show();
          },
          receive: function(e, ui) {
            // Dragging an item from another list to this one will
            // delete the item.
            ui.item.sortable.cancel();
            ui.item.sortable.deleted = true;
          },
        };
        scope.sortableDst = {
          connectWith: '.data-list',
          receive: function(e, ui) {
            if (!ui.item.sortable.moved.source)
              ui.item.sortable.moved = input.instantiateColumn(ui.item.sortable.moved);
          },
        };
      },
    };
  })
  .directive("pivotColumn", function() {
    return {
      restrict: 'EA',
      templateUrl: 'src/templates/column.html',
      replace: true,
      scope: {
        instance: '=pivotColumn',
      },
      link: function(scope, elm, attrs, ctrl) {
        scope.$watch('instance', function () {
          scope.column = scope.instance.source || scope.instance;
        });
        scope.getText = function (inst) {
          if (!inst.source)
            return inst.name;
          else if (inst.fn && inst.source.type === 'number')
            return inst.fn.name + ' ( ' + inst.source.name + ' )';
          else
            return inst.source.name;
        };
        scope.columnLabel = function(type) {
          return {
            number: { class: 'label-success', text: 'Number'},
            text: { class: 'label-info', text: 'Text'},
            date: { class: 'label-warning', text: 'Date'},
          }[type];
        };
      },
    };
  })
  .directive("axisConfig", function() {
    return {
      restrict: 'E',
      templateUrl: 'src/templates/axisConfig.html',
      scope: {
        axis: '=',
      },
      link: function(scope, elm, attrs, ctrl) {
        scope.scaleTypes = [
          { type: 'ordinal', name: 'Ordinal' },
          { type: 'linear', name: 'Linear' },
          { type: 'log', name: 'Logarithmic' }
        ];
      },
    };
  })
  .directive("d3Axis", function() {
    return {
      // Unfortunately <d3-axis ... /> with replace:true doesn't seem to work,
      // at least in Chrome. Using an attribute on a <g> element instead.
      restrict: 'A',
      scope: {
        scale: '=',
        orient: '@',
        tickFormat: '=',
        ticks: '=',
        tickSize: '=',
      },
      link: function(scope, elm, attrs, ctrl) {
        var axis = d3.svg.axis();
        scope.$watch('[scale,orient,tickFormat,ticks,tickSize]', function() {
          if (!angular.isUndefined(scope.scale)) axis.scale(scope.scale);
          if (!angular.isUndefined(scope.orient)) axis.orient(scope.orient);
          //if (!angular.isUndefined(scope.tickFormat)) axis.tickFormat(d3.format(scope.tickFormat));
          if (!angular.isUndefined(scope.ticks)) {
            var n = parseInt(scope.ticks);
            axis.ticks(n);
            if (typeof(scope.scale.rangeBands) !== "undefined") {
              var nth = Math.ceil(scope.scale.domain().length / n);
              var vals = scope.scale.domain()
                          .filter(function(d,i) { return i % nth === 0; });
              axis.tickValues(vals);
            }
          }
          if (!angular.isUndefined(scope.tickSize)) axis.tickSize(parseInt(scope.tickSize));
          axis(elm);
        }, true);
      },
    };
  })
  .directive("d3Legend", function(colors) {
    return {
      restrict: 'EA',
      templateUrl: 'src/templates/legend.html',
      scope: {
      },
      require: '?^graphArea',
      replace: true,
      link: function(scope, elm, attrs, graphArea) {
        scope.$watch(function() {
          if (graphArea) {
            var s = scope.data;
            var bbox = elm[0].getBBox();
            graphArea.setLegendWidth(bbox.width);
            scope.data = graphArea.getLegendData();
          }
        });
      },
    };
  })
  .directive("graphArea", function(colors) {
    return {
      restrict: 'E',
      templateUrl: 'src/templates/graphArea.html',
      replace: true,
      scope: {
        data: '=',
        maps: '=',
        width: '=w',
        height: '=h',
        title: '=',
        showTitle: '=',
        titleSize: '=',
        font: '=',
        userMargin: '=margin',
        showLegend: '=',
        background: '=',
        reverseLegend: '=',
      },
      transclude: true,
      controller: function($scope, $element, $attrs, $transclude) {
        var legendData = [];
        return {
          setLegendWidth: function(w) {
            $scope.legendWidth = w;
          },
          setLegendData: function (d) {
            legendData = d;
          },
          getLegendData: function (d) {
            return legendData;
          },
          setGraphArea: function(scope) {
            this.graphScope = scope;
            scope.width = $scope.graphWidth;
            scope.height = $scope.graphHeight;
          },
        };
      },
      link: function(scope, elm, attrs, ctrl, transcludeFn) {
        var titleElm = elm.find('.title')[0];
        scope.$watch('[data,maps]', function() {
          var colormaps = _.map(scope.maps.color, 'source');
          if (colormaps && colormaps.length) {
            scope.legendData = _(scope.data).map(colormaps[0].get).unique().value();
          } else {
            scope.legendData = [];
          }
        }, true);
        scope.$watch('[width,height,legendWidth,title,showTitle,titleSize,font,userMargin,showLegend]', function() {
          scope.titleHeight = scope.showTitle ? 1.3 * titleElm.getBBox().height : 0;
          scope.legendWidth = scope.showLegend ? (scope.legendWidth || 0) : 0;
          scope.margin = {
            top: scope.userMargin,
            right: scope.userMargin,
            bottom: scope.userMargin,
            left: scope.userMargin
          };
          scope.graphWidth = scope.width - scope.margin.left - scope.margin.right - scope.legendWidth;
          if (scope.legendWidth) {
            scope.graphWidth -= scope.margin.right/2;
          }
          scope.graphHeight = scope.height - scope.margin.top - scope.margin.bottom - scope.titleHeight;
          if (ctrl.graphScope) {
            ctrl.graphScope.width = scope.graphWidth;
            ctrl.graphScope.height = scope.graphHeight;
          }
        }, true);
      },
    };
  })
  .directive("pivotBars", function(pivotUtil) {
    return pivotUtil.twodChartDirective('src/templates/bars.html');
  })
  .directive("pivotLines", function(pivotUtil) {
    return pivotUtil.twodChartDirective('src/templates/lines.html');
  })
  .directive("pivotTreemap", function(pivotUtil) {
    return {
      restrict: 'E',
      templateUrl: 'src/templates/treemap.html',
      replace: true,
      scope: {
        chart: '=',
        data: '=',
        maps: '=',
        width: '=?',
        height: '=?',
      },
      require: '?^graphArea',
      link: function(scope, elm, attrs, graphArea) {
        if (graphArea) {
          graphArea.setGraphArea(scope);
        }
        scope.$watch('[data, maps, chart, width, height]', function() {
          var sizemaps = _(scope.maps.size).reject('error').map('source').value();
          var colormaps = _(scope.maps.color).reject('error').map('source').value();
          var textmaps = _(scope.maps.text).reject('error').map('source').value();
          var numberColor = _(colormaps).all({type: 'number'});
          var color, legenddata;
          if (numberColor) {
            var cd = d3.scale.category20().domain([0, 1]);
            color = d3.scale.linear()
              .domain(d3.extent(_(scope.data).map(colormaps[0].get).value()))
              .range([cd(1), cd(0)]);
            legenddata = [];
          } else {
            var colorkeys = _(colormaps).map(function (col) {
              return _(scope.data).map(col.get).unique().value();
            }).value();
            legenddata = _(colorkeys)
              .cartesianProduct().filter('length').map(function (a) {
                return a.join(" ");
              }).value();
            color = d3.scale.category20().domain(legenddata);
          }
          if (graphArea) {
            graphArea.setLegendData(_(legenddata).map(function (c) {
              return {
                text: c,
                color: color(c),
              };
            }).value());
          }
          function colorKey(d) {
            if (numberColor) {
              return colormaps[0].get(d);
            } else {
              return _(colormaps).map(function(c) {
                  return c.get(d);
              }).join(" ");
            }
          }
          scope.getColor = function (d) {
            return d.item ? color(colorKey(d.item)) : '';
          };
          scope.getText = function (d) {
            if (!d.item) return '';
            return sprintf(scope.maps.text.format,
                            _(textmaps).map(function (c) {
                              return [c.name, c.get(d.item)];
                            }).zipObject().value())
                    .split('\n');
          };

          var sum = _(scope.data).map(sizemaps[0].get).sum();
          var root = {
            children: _(scope.data).map(function (d) {
              return { item: d };
            }).value(),
          };
          var treemap = d3.layout.treemap()
            .value(function (node) {
              if (node.item)
                return sizemaps[0].get(node.item);
              else
                return sum;
            })
            .size([scope.width, scope.height]);
          scope.nodes = treemap.nodes(root);
        }, true);
      },
    };
  })
  .directive("pivotPie", function(colors, pivot) {
    return {
      restrict: 'E',
      templateUrl: 'src/templates/pie.html',
      replace: true,
      scope: {
        chart: '=',
        data: '=',
        maps: '=',
        width: '=?',
        height: '=?',
      },
      require: '?^graphArea',
      link: function(scope, elm, attrs, graphArea) {
        if (graphArea) {
          graphArea.setGraphArea(scope);
        }
        scope.$watch('[data, maps, width, height, chart]', function() {
          var sizemaps = _(scope.maps.size).reject('error').map('source').value();
          var colormaps = _(scope.maps.color).reject('error').map('source').value();
          var layermaps = _(scope.maps.layer).reject('error').map('source').value();
          var colormapsByLayer = _(layermaps).foldl(function (list, lm) {
            var rest = _.head(list);
            var i = _.findIndex(rest, lm);
            var split = i === -1 ? rest.length : i + 1;
            return [_.tail(rest, split), _.head(rest, split)].concat(_.tail(list));
          }, [colormaps]).reverse();
          var r = Math.min(scope.width, scope.height)/2;
          var r0 = (scope.chart.innerRadius || 0) * r;
          var dr = (r - r0) / colormapsByLayer.length;
          var d3arcs = _(colormapsByLayer).map(function (c, i) {
            return d3.svg.arc()
              .innerRadius(r0 + i * dr)
              .outerRadius(r0 + (i + 1.01) * dr);
          }).value();
          function process(i, maps, data, parent) {
            var cm = colormapsByLayer[i];
            //if (i > 0)
            //  cm = [layermaps[i - 1]].concat(cm);
            cm = _.unique(cm);
            var processed = pivot.processSingle(cm, maps, data);
            var colorscaleIdx = -1;
            if (!parent)
              colorscaleIdx = 0;
            else if (colormapsByLayer[i].length)
              colorscaleIdx = parent.colorscaleIdx + 1;
            if (colormapsByLayer[i].length)
              colorscale = d3.scale.category20().domain(_.map(processed, 'colorKey'));
            _(processed).each(function (l) {
              l.layer = i;
              l.colorscale = colorscale;
              l.colorscaleIdx = colorscaleIdx;
              l.parent = parent;
            });
            if (i >= colormapsByLayer.length - 1)
              return processed;
            var sublayers = _(processed).map(function (p) {
              return process(i + 1, p.reducedValuemaps, p.reducedItems, p);
            }).flatten().value();
            return processed.concat(sublayers);
          }
          scope.itemdata = process(0, sizemaps, scope.data, null);
          scope.itemdataByLayer = _(scope.itemdata).groupBy('layer').value();
          var pies = _(scope.itemdataByLayer).map(function (itemdata) {
            return d3.layout.pie().sort(null)(_.map(itemdata, 'reducedValue'));
          }).value();
          var colorscales = _(colormapsByLayer).map(function (cc, i) {
            var domain = _(scope.itemdata).filter({colorscaleIdx: i});
            var scales = ['category20', 'category20b', 'category20c'];
            return d3.scale[scales[i%3]]().domain(domain.map('colorKey').unique().value());
          }).value();
          if (graphArea) {
            var legenddata = _(colorscales).map(function (scale) {
              return _.map(scale.domain(), function(d) {
                return { text: d, color: scale(d) };
              }).concat([{isSeparator:true, color:'#000',test:'foo'}]);
            }).flatten().value();
            graphArea.setLegendData(legenddata);
          }

          scope.arc = function(layerIdx, idxWithinLayer) {
            if (layerIdx >= d3arcs.length || idxWithinLayer >= pies[layerIdx].length)
              return "M0,0";
            return d3arcs[layerIdx](pies[layerIdx][idxWithinLayer]);
          };
          scope.color = function(item) {
            if (item.colorscaleIdx >= colorscales.length)
              return "M0,0";
            if (item.colorscaleIdx !== -1)
              return colorscales[item.colorscaleIdx](item.colorKey);
            else
              return scope.color(item.parent);
          };
        }, true);
      },
    };
  })
  .directive("autofocus", function($timeout) {
    return {
      restrict: 'A',
      link: function(scope, elm, attrs, ctrl) {
        // Double $timeout required for this to work, for an unknown reason.
        $timeout(function() {
          $timeout(function() {
            elm[0].focus();
            elm[0].select();
          }, false);
        }, false);
      },
    };
  })
  .directive("panel", function() {
    return {
      restrict: 'E',
      template: '<div><div class="panel panel-default">' +
                '  <div class="panel-heading">{{heading}}</div>' +
                '  <div class="panel-body">' +
                '    <div ng-transclude></div>' +
                '  </div>' +
                '</div></div>',
      replace: true,
      transclude: true,
      scope: {
        heading: '@',
      },
      link: function(scope, elm, attrs, ctrl) {},
    };
  })
  .directive('handsontable', function ($rootScope) {
    return {
      restrict: 'A',
      require: '?ngModel',
      link: function(scope, iElement, iAttrs, ngModel) {
        var ht;
        var opts = {
          cells: function (row, col, prop) {
              if (!ht || !ht.getData() || !ht.getData()[row])
                return;
              var val = ht.getData()[row][col];
              var num = Number(val);
              var meta = {};
              if (val !== '' && !Number.isNaN(num)) {
                meta.renderer = Handsontable.NumericRenderer;
              } else {
                meta.renderer = Handsontable.TextRenderer;
              }
              return meta;
          },
          beforeChange: function (changes, source) {
            _(changes).each(function(c) {
              var row = c[0], col = c[1], old = c[2], next = c[3];
              var meta = ht.getCellMeta(row, col);
              var num = Number(c[3]);
              if (c[3] !== '' && !Number.isNaN(num)) {
                c[3] = num;
                meta.renderer = Handsontable.NumericRenderer;
              } else {
                meta.renderer = Handsontable.TextRenderer;
              }
            });
          },
          afterChange: function (changes, source) {
            if (!scope.$$phase)
              $rootScope.$apply();
          },
        };
        _.extend(opts, scope.$eval(iAttrs.handsontable));
        $(iElement).handsontable(opts);
        ht = $(iElement).handsontable('getInstance');
        if (ngModel) {
          ngModel.$render = function (d) {
            if (ngModel.$viewValue != ht.getData())
              ht.loadData(ngModel.$viewValue);
            ht.render();
          };
        }
      },
    };
  })
  // A simplified (and working) version of http://github.com/angular-ui/ui-codemirror.
  .directive('uiCodemirror', function () {
    return {
      restrict: 'EA',
      require: '?^ngModel',
      priority: 1,
      link: function(scope, iElement, iAttrs, ngModel) {
        if (angular.isUndefined(window.CodeMirror)) {
          throw new Error('ui-codemirror needs CodeMirror to work.');
        }

        // http://codemirror.net/doc/manual.html#api_constructor
        var codeMirror = new window.CodeMirror(function (cm_el) {
          iElement.append(cm_el);
        });

        function updateOptions(newValues) {
          for (var key in newValues) {
            if (newValues.hasOwnProperty(key)) {
              codeMirror.setOption(key, newValues[key]);
            }
          }
        }
        updateOptions(scope.$eval(iAttrs.uiCodemirror));
        if (angular.isDefined(scope.$eval(iAttrs.uiCodemirror))) {
          scope.$watch(iAttrs.uiCodemirror, updateOptions, true);
        }

        codeMirror.on('change', function (instance) {
          var newValue = instance.getValue();
          if (ngModel && newValue !== ngModel.$viewValue) {
            ngModel.$setViewValue(newValue);
            scope.$apply();
          }
        });

        if (ngModel) {
          ngModel.$formatters.unshift(function (value) {
            if (angular.isUndefined(value) || value === null) {
              return '';
            }
            else if (angular.isObject(value) || angular.isArray(value)) {
              throw new Error('ui-codemirror cannot use an object or an array as a model');
            }
            return value;
          });

          ngModel.$render = function () {
            var safeViewValue = ngModel.$viewValue || '';
            codeMirror.setValue(safeViewValue);
          };
        }

        // Watch ui-refresh and refresh the directive
        if (iAttrs.uiRefresh) {
          scope.$watch(iAttrs.uiRefresh, function (newVal, oldVal) {
            // Skip the initial watch firing
            if (newVal !== oldVal) {
              codeMirror.refresh();
            }
          });
        }

      }
    };
  })
  .directive("editableFunction", function() {
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
    return {
      restrict: 'E',
      template: '<div><div js-function ui-codemirror="opts" ui-refresh="refresh"></div>' +
          '<div class="alert alert-danger alert-bottom" ng-show="error">{{error}}</div>' +
          '</div>',
      scope: {
        evalThis: '=',
        evalArgs: '=',
        validateFn: '=',
        refresh: '=uiRefresh',
      },
      replace: true,
      require: ['editableFunction', 'ngModel'],
      controller: function($scope) {
        this.setSyntaxError = function(err) {
          $scope.error = err;
        };
        this.validate = function(f) {
          if ($scope.validateFn) {
            $scope.error = $scope.validateFn(f);
            return;
          }
          $scope.error = undefined;
          if ($scope.evalThis || $scope.evalArgs) {
            try {
              f.apply($scope.evalThis || {}, $scope.evalArgs);
            } catch(e) {
              $scope.error = e.message;
              return false;
            }
          }
          return true;
        };
      },
      link: function(scope, elm, attrs, ctrls) {
        var ctrl = ctrls[0];
        var ngModel = ctrls[1];
        function betterTab(cm) {
          if (cm.somethingSelected()) {
            cm.indentSelection("add");
          } else {
            cm.replaceSelection(cm.getOption("indentWithTabs")? "\t":
                Array(cm.getOption("indentUnit") + 1).join(" "), "end", "+input");
          }
        }
        scope.$watch('evalArgs', function() {
          ctrl.validate(ngModel.$modelValue);
        });
        scope.$watch('evalThis', function() {
          ctrl.validate(ngModel.$modelValue);
        });
        scope.opts = { tabSize: 2, extraKeys: { Tab: betterTab } };
      },
    };
  })
  .directive("jsFunction", function() {
    return {
      restrict: 'A',
      require: ['^ngModel', '?^editableFunction'],
      link: function(scope, elm, attrs, ctrl) {
        var ngModel = ctrl[0];
        var editableFunction = ctrl[1];
        ngModel.$parsers.unshift(function(viewValue) {
          try {
            if (!viewValue)
              return undefined;
            /* jshint -W054 */
            var f = new Function("return " + viewValue)();
            /* jshint +W054 */
            if (editableFunction) {
              editableFunction.validate(f);
            }
            ngModel.$setValidity('function', true);
            return f;
          } catch(err) {
            ngModel.$setValidity('function', false);
            if (editableFunction) {
              editableFunction.setSyntaxError(err.message);
            }
            return undefined;
          }
        });
        ngModel.$formatters.unshift(function(modelValue) {
          if (editableFunction) {
            editableFunction.validate(modelValue);
          }
          if (typeof modelValue === 'object') {
            return JSON.stringify(modelValue, null, "  ");
          } else if (typeof modelValue === 'function') {
            return modelValue.toString();
          } else {
            return '';
          }
        });
      },
    };
  })
  .directive("jsObject", function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, elm, attrs, ctrl) {
        var modelCtrl = ctrl;
        modelCtrl.$parsers.unshift(function(viewValue) {
          try {
            return JSON.parse(viewValue);
          } catch(err) {
            modelCtrl.$setValidity('json', false);
            return undefined;
          }
        });
        modelCtrl.$formatters.unshift(function(modelValue) {
          return JSON.stringify(modelValue);
        });
      },
    };
  })
  .directive('contenteditable', function($rootScope) {
    return {
      require: 'ngModel',
      link: function(scope, elm, attrs, ctrl) {
        // view -> model
        elm.bind('blur', function() {
          if (elm.html() != ctrl.$viewValue) {
            scope.$apply(function() {
              ctrl.$setViewValue(elm.html().replace(/<br>/g, ""));
            });
          }
        });
        elm.bind('keypress', function(e) { return e.which != 13; });
        elm.bind('keyup', function(e) {
          if (e.keyCode == 13) {
            $(elm).blur();
          }
        });
        // model -> view
        ctrl.$render = function() {
          elm.html(ctrl.$viewValue);
        };
      }
    };
  })
  .directive("percentage", function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      compile: function(tElement, tAttrs, transclude) {
        return function (scope, elm, attrs, ctrl) {
          ctrl.$parsers.unshift(function (viewValue) {
            return parseFloat(viewValue) / 100;
          });
          ctrl.$formatters.unshift(function (modelValue) {
            return modelValue * 100 + ' %';
          });
        };
      }
    };
  })
  .directive('hcollapse', ['$transition', function ($transition, $timeout) {

    return {
      link: function (scope, element, attrs) {

        var initialAnimSkip = true;
        var currentTransition;

        function doTransition(change) {
          var newTransition = $transition(element, change);
          if (currentTransition) {
            currentTransition.cancel();
          }
          currentTransition = newTransition;
          newTransition.then(newTransitionDone, newTransitionDone);
          return newTransition;

          function newTransitionDone() {
            // Make sure it's this transition, otherwise, leave it alone.
            if (currentTransition === newTransition) {
              currentTransition = undefined;
            }
          }
        }

        function expand() {
          if (initialAnimSkip) {
            initialAnimSkip = false;
            expandDone();
          } else {
            element.removeClass('collapse').addClass('collapsing');
            doTransition({ width: element[0].scrollWidth + 'px' }).then(expandDone);
          }
        }

        function expandDone() {
          element.removeClass('collapsing');
          element.addClass('collapse in');
          element.css({width: 'auto'});
        }

        function collapse() {
          if (initialAnimSkip) {
            initialAnimSkip = false;
            collapseDone();
            element.css({width: 0});
          } else {
            // CSS transitions don't work with height: auto, so we have to manually change the height to a specific value
            element.css({ width: element[0].scrollWidth + 'px' });
            //trigger reflow so a browser realizes that height was updated from auto to a specific value
            var y = element[0].offsetHeight;
            var x = element[0].offsetWidth;

            element.removeClass('collapse in').addClass('collapsing');

            doTransition({ width: 0 }).then(collapseDone);
          }
        }

        function collapseDone() {
          element.removeClass('collapsing');
          element.addClass('collapse');
        }

        scope.$watch(attrs.hcollapse, function (shouldCollapse) {
          if (shouldCollapse) {
            collapse();
          } else {
            expand();
          }
        });
      }
    };
  }]);
