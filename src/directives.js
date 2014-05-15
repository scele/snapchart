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
              scope.xdata = _(scope.data)
                .map(scope.maps.columns[0].get)
                .unique()
                .value();
              scope.ydata = _(scope.data)
                .groupBy(scope.maps.columns[0].get)
                .map(function(a) { return _.map(a, scope.maps.rows[0].get); })
                .value();
              //_(scope.data).map(scope.maps.rows[0].get).value();
              //scope.seriesdata = _(scope.data).map(scope.maps.colors[0].get).value();
              //scope.dataBySeries = _(scope.data).groupBy(scope.maps.colors[0].get).toArray();
              var vAxis = scope.chart.vAxis;
              var hAxis = scope.chart.hAxis;
              var range0, domain0;
              var xOffset = 0;
              scope.innerWidth = scope.width - scope.margin;
              if (hAxis.type == 'ordinal') {
                scope.x = d3.scale.ordinal().domain(scope.xdata);
                scope.x.rangeRoundBands([0, scope.innerWidth], hAxis.band, 0);
                if (scope.x.rangeBand() == 0) {
                  scope.x.rangeBands([0, scope.innerWidth], hAxis.band, 0);
                }
                range0 = [0, scope.x.rangeBand()];
                domain0 = d3.range(scope.ydata[0].length);
                if (scope.chart.barPlacement == 'adjacent') {
                  scope.x0 = d3.scale.ordinal()
                    .rangeRoundBands(range0, hAxis.band2)
                    .domain(domain0);
                  if (scope.x0.rangeBand() == 0) {
                    scope.x0.rangeBands(range0, hAxis.band2);
                  }
                } else {
                  scope.x0 = d3.scale.ordinal()
                    .rangeRoundBands(range0)
                    .domain([0]);
                }
              } else {
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
              }

              var minY, maxY;
              if (scope.chart.type.type == 'pivot-bars' &&
                  scope.chart.barPlacement == 'stacked') {
                maxY = _(scope.ydata).map(function (yy) {
                  return _.reduce(yy, function(sum, num) {
                    return sum + Math.max(num, 0);
                  }, 0);
                }).max();
                minY = _(scope.ydata).map(function (yy) {
                  return _.reduce(yy, function(sum, num) {
                    return sum + Math.min(num, 0);
                  }, 0);
                }).min();
              } else {
                var allY = _(scope.ydata).flatten();
                minY = allY.min();
                maxY = allY.max();
              }
              scope.y = getScale(vAxis, [Math.min(0, minY), Math.max(maxY, 0)])
                .range([scope.height, 10]);
              scope.line = d3.svg.line()
                .x(function (d) { return scope.lineX(d.x); })
                .y(function (d) { return scope.y(d.y); })
                .interpolate(scope.chart.lineInterpolation);
              scope.barY = function (seriesIdx, categoryIdx) {
                var ydata = scope.ydata[categoryIdx];
                var y = ydata[seriesIdx];
                if (scope.chart.barPlacement == 'stacked') {
                  var others = _(scope.ydata[categoryIdx])
                    .take(seriesIdx)
                    .filter(function (x) { return x * y >= 0; })
                    .reduce(function (sum, num) {
                      return sum + num;
                    }, 0);
                  return scope.y(Math.max(0, y) + others);
                } else {
                  return scope.y(Math.max(0, y));
                }
              };
              scope.barsX = function (x) {
                return scope.x(x) + xOffset;
              };
              scope.barX = function (seriesIdx) {
                if (scope.chart.barPlacement == 'adjacent')
                  return scope.x0(seriesIdx);
                else
                  return 0;
              };
              scope.barColor = function(seriesIdx) {
                //if (s
              };
              scope.lineX = function (x) {
                if (scope.chart.hAxis.type == 'ordinal') {
                  return scope.x(x) + scope.x.rangeBand() / 2;
                } else {
                  return scope.x(x);
                }
              };


              vAxis.min = scope.y.domain()[0];
              vAxis.max = scope.y.domain()[1];
              hAxis.min = scope.x.domain()[0];
              hAxis.max = _.last(scope.x.domain());

              scope.barHeight = function (val) {
                var zero = Math.min(Math.max(0, vAxis.min), vAxis.max);
                return Math.abs(scope.y(val) - scope.y(zero));
              };

              scope.color = colors.get;
              scope.abs = Math.abs;
              scope.max = Math.max;
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
            $compile(elm.contents())(scope);
          }
        );
      },
    };
  })
  .directive("pivotColumn", function() {
    return {
      restrict: 'EA',
      templateUrl: 'src/templates/column.html',
      replace: true,
      scope: {
        column: '=pivotColumn',
      },
      link: function(scope, elm, attrs, ctrl) {
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
              axis.tickValues(scope.scale.domain().filter(function(d,i) { return !(i%nth); }));
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
      template: '<svg><g ng-repeat="d in reversedData track by $index" transform="translate(0,{{20 * $index}})">' +
                  '<rect width="15" height="15" ' +
                  '  style="fill:{{color(d.index)}}">' +
                  '</rect>' +
                  '<text x="20" y="9" style="text-anchor:top; alignment-baseline:middle;">' +
                    '{{d.text}}' +
                  '</text>' +
                '</g></svg>',
      scope: {
        data: '=',
        reverse: '=',
      },
      require: '?^graphArea',
      replace: true,
      link: function(scope, elm, attrs, graphArea) {
        scope.color = colors.get;
        scope.$watch('[reverse,data]', function() {
          scope.reversedData = _(scope.data).clone().map(function (d, i) {
              return { text: d, index: i }; });
            if (scope.reverse) scope.reversedData.reverse();
        }, true);
        scope.$watch(function() {
          if (graphArea) {
            var s = scope.data;
            var bbox = elm[0].getBBox();
            graphArea.setLegendWidth(bbox.width);
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
        return {
          setLegendWidth: function(w) {
            $scope.legendWidth = w;
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
          if (scope.maps.colors && scope.maps.colors.length) {
            scope.legendData = _(scope.data).map(scope.maps.colors[0].get).unique().value();
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
  .directive("pivotPie", function(colors) {
    return {
      restrict: 'E',
      templateUrl: 'src/templates/pie.html',
      replace: true,
      scope: {
        chart: '=',
        data: '=',
        width: '=?',
        height: '=?',
      },
      require: '?^graphArea',
      link: function(scope, elm, attrs, graphArea) {
        if (graphArea) {
          graphArea.setGraphArea(scope);
        }
        scope.$watch('[data, width, height, chart]', function() {
          var r = Math.min(scope.width, scope.height)/2;
          var d3arc = d3.svg.arc()
            .outerRadius(r)
            .innerRadius((scope.chart.innerRadius || 0) * r);
          scope.yfirst = _.map(scope.data.y, _.first);
          var pie = d3.layout.pie()(scope.yfirst);
          scope.arc = function(i) {
            return d3arc(pie[i]);
          };
        }, true);
        scope.color = colors.get;
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
  // A simplified (and working) version of http://github.com/angular-ui/ui-codemirror.
  .directive('uiCodemirror', function () {
    return {
      restrict: 'EA',
      require: '?ngModel',
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
    _.mixin({'transpose': transpose});
    return {
      restrict: 'E',
      template: '<div><div js-function ui-codemirror="opts" ui-refresh="refresh" ng-model="scopemodel"></div>' +
          '<div class="alert alert-danger alert-bottom" ng-show="error">{{error}}</div>' +
          '</div>',
      scope: {
        scopemodel: '=ngModel',
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
        function betterTab(cm) {
          if (cm.somethingSelected()) {
            cm.indentSelection("add");
          } else {
            cm.replaceSelection(cm.getOption("indentWithTabs")? "\t":
                Array(cm.getOption("indentUnit") + 1).join(" "), "end", "+input");
          }
        }
        scope.$watch('evalArgs', function() {
          ctrl.validate(scope.scopemodel);
        });
        scope.$watch('evalThis', function() {
          ctrl.validate(scope.scopemodel);
        });
        scope.opts = { tabSize: 2, extraKeys: { Tab: betterTab } };
      },
    };
  })
  .directive("jsFunction", function() {
    return {
      restrict: 'A',
      require: ['ngModel', '?^editableFunction'],
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
