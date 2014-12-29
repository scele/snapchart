angular.module('pivotchart.directive', ['pivotchart.service'])
  .directive("snapchart", function() {
    return {
      restrict: 'E',
      templateUrl: 'src/templates/snapchart.html',
      replace: true,
      scope: {
        chart: '=',
        data: '=',
        maps: '=',
      },
      link: function(scope, elm, attrs) {
      },
    };
  })
  .factory('pivotUtil', function (pivot) {
    function getScale(config, defaultDomain) {
      var axis = d3.scale[config.type]();
      if (config.auto)
        return axis.domain(defaultDomain).nice();
      else
        return axis.domain([config.min, config.max]);
    }
    return {
      getScale: getScale,
      twodChartDirective: function (template, subtype) {
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
              if (subtype === 'lines' &&
                  lastXmap && pivot.getMapType(lastXmap, scope.data) === 'number') {
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
                if (_.isUndefined(band)) {
                  band = 0.1;
                }
                var innerBand = hAxis.innerBands ? hAxis.innerBands[i] : 0.1;
                if (_.isUndefined(innerBand)) {
                  innerBand = 0.1;
                }
                var x = d3.scale.ordinal()
                  .domain(xdata);

                if (col === lastXmap && subtype === 'lines') {
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
      link: function(scope, elm, attrs, ctrl) {
        elm.resizable({
          resize: function(e, ui) {
            // Let other angular components (e.g. graphArea)
            // observe the size change.
            scope.$apply();
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
            return attrs.dynamicDirective;
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
          // Server-side svg rendering needs inline styles...
          $(elm).find("path, line").attr("style", "fill: none; stroke: #333;");
          if (scope.orient == 'bottom') {
            $(elm).find("text").attr("style", "text-anchor: middle; alignment-baseline: middle;");
          }
        }, true);
      },
    };
  })
  .directive("d3Legend", function() {
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
  .directive("graphArea", function($window) {
    return {
      restrict: 'E',
      templateUrl: 'src/templates/graphArea.html',
      replace: true,
      scope: {
        data: '=',
        maps: '=',
        title: '=',
        showTitle: '=',
        titleSize: '=',
        fontSize: '=',
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
        scope.$watch(function() {
          return elm.parent().height();
        }, function (newValue, oldValue, s) {
          s.height = newValue;
        });
        scope.$watch(function() {
          return elm.parent().width();
        }, function (newValue, oldValue, s) {
          s.width = newValue;
        });
        angular.element($window).bind('resize', function() {
          scope.$apply();
        });
        scope.$watch('[data,maps]', function() {
          var colormaps = _.map(scope.maps.color, 'source');
          if (colormaps && colormaps.length) {
            scope.legendData = _(scope.data).map(colormaps[0].get).unique().value();
          } else {
            scope.legendData = [];
          }
        }, true);
        scope.$watch('[width,height,legendWidth,title,showTitle,titleSize,fontSize,font,userMargin,showLegend]', function() {
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
    return pivotUtil.twodChartDirective('src/templates/bars.html', 'bars');
  })
  .directive("pivotLines", function(pivotUtil) {
    return pivotUtil.twodChartDirective('src/templates/lines.html', 'lines');
  })
  .directive("pivotTreemap", function(pivotUtil, pivot) {
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
          var numberColor = _(colormaps).all(function (c) {
                                  return pivot.getMapType(c, scope.data) === 'number';});
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
  .directive("pivotSankey", function(pivot) {
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
  .directive("pivotPie", function(pivot) {
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
  });
