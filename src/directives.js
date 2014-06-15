angular.module('pivotchart.directive', [])
  .factory('pivotUtil', function (colors, pivot) {
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
              var lastXmap = _(xmaps).last();
              var lastXmapIsNumeric = false;
              if (scope.chart.type.type === 'pivot-lines' &&
                  lastXmap && lastXmap.type === 'number') {
                lastXmapIsNumeric = true;
              }
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

              scope.x = _(xmaps).map(function(col, i) {
                var xdata = scope.xdata[i];
                // For line/scatte plots, the last x-scale may be linear.
                if (col === lastXmap && lastXmapIsNumeric) {
                  var l = d3.scale.linear()
                    .domain(d3.extent(xdata))
                    .rangeRound([0, scope.barWidth]);
                  l.linear = true;
                  return l;
                }
                var band = hAxis.bands ? hAxis.bands[i] : 0.1;
                var innerBand = hAxis.innerBands ? hAxis.innerBands[i] : 0.1;
                if (_.isUndefined(band)) {
                  band = 0.1;
                }
                var x = d3.scale.ordinal()
                  .domain(xdata);

                if (col === lastXmap && scope.chart.type.type === 'pivot-lines') {
                  x.rangePoints([0, scope.barWidth], 1);
                } else {
                  x.rangeRoundBands([0, scope.barWidth], band, innerBand);
                  if (x.rangeBand() === 0) {
                    x.rangeBands([0, scope.barWidth], band, innerBand);
                  }
                  scope.barWidth = x.rangeBand();
                }
                return x;
              }).value();

              var bars = _(scope.xdata).cartesianProduct().value();

              scope.itemdata = _(bars).map(function (bar, i) {
                var p = pivot.processSingle(colormaps, [], ymaps, scope.data, bar, xmaps);
                _(p).each(function (p) { p.barIdx = i; });
                return p;
              }).flatten().value();
              scope.itemdataByColorkey = _(scope.itemdata).groupBy('colorKey').value();

              var legenddata = _(scope.itemdata).map('colorKey').unique().value();
              var colorscale = scope.chart.colorScales[0].scale.copy().domain(legenddata);
              if (graphArea) {
                graphArea.setLegendData(_(legenddata).map(function (c) {
                  return {
                    text: c,
                    color: colorscale(c),
                  };
                }).value());
              }

              scope.axisPadding = 30;
              scope.showAxis = function (axis) {
                var dimension = _.indexOf(scope.x, axis);
                if (dimension == -1)
                  return false;
                return -1 == _(colormaps)
                  .findIndex({ index: xmaps[dimension].index });
              };
              scope.visibleXAxes = _(scope.x).filter(scope.showAxis).value();

              var ydata = _(scope.itemdata).groupBy('barIdx').value();
              var maxY = _(ydata).map(function (yy) {
                return _(yy).map('reducedValue')
                            .filter(function (y) { return y > 0; })
                            .sum();
              }).max();
              var minY = _(ydata).map(function (yy) {
                return _(yy).map('reducedValue')
                            .filter(function (y) { return y < 0; })
                            .sum();
              }).min();
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
                    return x(d.reduced[0].valuemap.name);
                  } else {
                    return x(xmaps[i].get(d.reduced[0].item));
                  }
                }).sum();
              };
              scope.barColor = function (d) {
                return colorscale(d.colorKey);
              };
              scope.barHeight = function (d) {
                var zero = Math.min(Math.max(0, vAxis.min), vAxis.max);
                return Math.abs(scope.y(d.reducedValue) - scope.y(zero));
              };

              // Line graphs
              scope.line = d3.svg.line()
                .x(function (d) {
                  return scope.barX(d);
                })
                .y(function (d) {
                  return scope.y(d.reducedValue);
                })
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
        scope.$watch('[columns,restrict]', function () {
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
          if (!angular.isUndefined(scope.tickFormat)) axis.tickFormat(d3.format(scope.tickFormat));
          if (!angular.isUndefined(scope.ticks)) {
            var n = parseInt(scope.ticks);
            axis.ticks(n);
            if (typeof(scope.scale.rangeBands) !== "undefined") {
              var nth = Math.ceil(scope.scale.domain().length / n);
              var vals = scope.scale.domain()
                          .filter(function(d,i) { return i % nth === 0; });
              axis.tickValues(vals);
            } else {
              axis.tickValues(null);
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
            var c0 = scope.chart.colorScales[0].scale.range()[0];
            var c1 = scope.chart.backgroundRgb;
            var c2 = scope.chart.colorScales[0].scale.range()[scope.chart.colorScales[0].primarySpan];
            var cd = function (t) {
              if (t > 0.5)
                return d3.interpolateRgb(c1, c2)(t/2);
              else
                return d3.interpolateRgb(c0, c1)(t*2);
            };
            var domain = _(scope.data).map(colormaps[0].get).value();
            var extent = d3.extent(domain);
            color = d3.scale.ordinal()
              .domain(domain)
              .range(_(domain).map(function (d) {
                var t = (d - extent[0]) / (extent[1] - extent[0]);
                return cd(t);
              }).value());
            legenddata = [];
            scope.chart.colorScaleIsNumeric = true;
          } else {
            var colorkeys = _(colormaps).map(function (col) {
              return _(scope.data).map(col.get).unique().value();
            }).value();
            legenddata = _(colorkeys)
              .cartesianProduct().filter('length').map(function (a) {
                return a.join(" ");
              }).value();
            color = scope.chart.colorScales[0].scale.copy().domain(legenddata);
            scope.chart.colorScaleIsNumeric = false;
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
          scope.textColor = scope.chart.backgroundRgb;
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
  .directive("pivotSankey", function(colors, pivot) {
    return {
      restrict: 'E',
      templateUrl: 'src/templates/sankey.html',
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
          var ymaps = _(scope.maps.y).reject('error').map('source').value();
          var colormaps = _(scope.maps.color).reject('error').map('source').value();
          var xmaps = _(scope.maps.x).reject('error').map('source').value();
          var links = [];
          var nodes = _(xmaps).map(function (col) {
            if (col.variable) {
              return _(ymaps).map('name').unique().value();
            } else {
              return _(scope.data).map(col.get).unique().value();
            }
          }).map(function (nn, i) {
            return _(nn).map(function (n) { return {name: n, xmapIdx: i}; }).value();
          }).value();

          scope.linkOpacity = scope.chart.streamOpacity;
          var colors = pivot.processColors(colormaps, ymaps,
                                           scope.chart.colorScales, scope.data);
          _(colors.legenddata).each(function (d) { d.opacity = scope.linkOpacity; });
          if (graphArea)
            graphArea.setLegendData(colors.legenddata);

          function toLink(i) {
            return function (p) {
              var tail = _.last(p.colorKeys, 2);
              var colorKey = _(p.colorKeys).head(p.colorKeys.length - 2).join(' ');
              var sortKey = -1 * _(colors.legenddata).map('text').indexOf(colorKey);
              return {
                source: _(nodes[i]).filter({name: tail[0]}).first(),
                target: _(nodes[i+1]).filter({name: tail[1]}).first(),
                value: p.reducedValue,
                item: p,
                targetSortKey: i === 0 ? 0 : sortKey,
                sourceSortKey: i === xmaps.length - 2 ? 0 : sortKey,
                column: i,
              };
            };
          }
          for (var i = 0; i < xmaps.length - 1; i++) {
            var maps = colormaps.concat([xmaps[i], xmaps[i+1]]);
            var p = pivot.processSingle(maps, [], ymaps, scope.data);
            p = _(p).map(toLink(i)).value();
            links = links.concat(p);
          }

          var nodeWidth = scope.chart.nodeWidth * scope.width / xmaps.length;
          var nodePadding = (1 - scope.chart.streamThickness) * scope.height /
                              (_(nodes).map('length').max() - 1);
          var middle = scope.chart.hAxis.nodeTextPosition === 'over';
          scope.ypad = middle ? 0 : 20;
          var sankey = d3.sankey()
            .nodeWidth(nodeWidth)
            .nodePadding(nodePadding)
            .extendLinksThroughNodes(true)
            .size([scope.width, scope.height - scope.ypad])
            .nodes(_.flatten(nodes))
            .links(links)
            .layout(32)
            .link();
          scope.links = links;
          scope.nodes = _.flatten(nodes);
          scope.stream = function (d) {
            return sankey(d);
          };
          scope.streamWidth = function (link) {
            return Math.max(1, link.dy);
          };
          scope.color = function (link) {
            var colorKey = _(link.item.colorKeys).head(link.item.colorKeys.length - 2).join(' ');
            return colors.colorscale(colorKey);
          };
          scope.text = function (n) {
            var d = {};
            d.show = scope.chart.hAxis.showText[n.xmapIdx];
            if (middle) {
              d.class = 'middle';
              d.y = n.y + n.dy / 2;
              d.color = scope.chart.backgroundRgb;
            } else {
              d.class = 'top';
              d.y = n.y - 3;
              d.color = 'inherit';
            }
            if (n.xmapIdx === 0) {
              d.x = n.x;
              d.align = 'start';
              if (middle) d.x += 5;
            } else if (n.xmapIdx === xmaps.length - 1) {
              d.x = n.x + nodeWidth;
              d.align = 'end';
              if (middle) d.x -= 5;
            } else {
              d.x = n.x + nodeWidth / 2;
              d.align = 'middle';
            }
            return d;
          };
        }, true);
      },
    };
  })
  .directive("pivotScope", function() {
    return {
      restrict: 'A',
      scope: true,
      link: function(scope, elm, attrs) {
        attrs.$observe('pivotScope', function() {
          _.assign(scope, scope.$parent.$eval(attrs.pivotScope));
        });
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
            var detailmaps = [];
            if (i > 0)
              detailmaps = [layermaps[i - 1]];
            cm = _.unique(cm);
            var processed = pivot.processSingle(cm, detailmaps, maps, data);
            var colorscaleIdx = -1;
            if (!parent)
              colorscaleIdx = 0;
            else if (colormapsByLayer[i].length)
              colorscaleIdx = parent.colorscaleIdx + 1;
            _(processed).each(function (l) {
              l.layer = i;
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
            return scope.chart.colorScales[0].scale.copy().domain(domain.map('colorKey').unique().value());
          }).value();

          // Set ranges for each colorscale so that they start from
          // primary group boundaries.
          _(colorscales).each(function (cc, i) {
            var prevColors = _(colorscales).take(i).map(function (scale) {
              function round(x, y) {
                return Math.floor((x + y - 1) / y) * y;
              }
              return round(scale.domain().length, scope.chart.colorScales[0].primarySpan);
            }).sum();
            cc.range(_.rest(cc.range(), prevColors));
          });

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
        // Use a TextRenderer-based renderer so we show all decimals.
        var numRenderer = function (instance, td, row, col, prop, value, cellProperties) {
          Handsontable.renderers.TextRenderer.apply(this, arguments);
          $(td).addClass('htNumeric');
        };
        var opts = {
          cells: function (row, col, prop) {
              if (!ht || !ht.getData() || !ht.getData()[row])
                return;
              var val = ht.getData()[row][col];
              var num = Number(val);
              var meta = {};
              if (val !== '' && !Number.isNaN(num)) {
                meta.renderer = numRenderer;
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
                meta.renderer = numRenderer;
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
