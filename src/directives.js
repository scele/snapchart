angular.module('pivotchart.directive', [])
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

  .directive("d3Axis", function() {
    return {
      // Unfortunately <d3-axis ... /> with replace:true doesn't seem to work,
      // at least in Chrome. Using an attribute on a <g> element instead.
      restrict: 'A',
      scope: {
        scale: '=',
        orient: '@',
        tickFormat: '@',
        ticks: '=',
        tickSize: '=',
      },
      link: function(scope, elm, attrs, ctrl) {
        var axis = d3.svg.axis();
        scope.$watch('[scale,orient,tickFormat,ticks]', function() {
          if (!angular.isUndefined(scope.scale)) axis.scale(scope.scale);
          if (!angular.isUndefined(scope.orient)) axis.orient(scope.orient);
          if (!angular.isUndefined(scope.tickFormat)) axis.tickFormat(d3.format(scope.tickFormat));
          if (!angular.isUndefined(scope.ticks)) axis.ticks(parseInt(scope.ticks));
          if (!angular.isUndefined(scope.tickSize)) axis.tickSize(parseInt(scope.tickSize));
          axis(elm);
        }, true);
      },
    };
  })
  .directive("d3Legend", function(colors) {
    return {
      restrict: 'A',
      template: '<g ng-repeat="d in data" transform="translate(0,{{20 * $index}})">' +
                  '<rect width="15" height="15" ' +
                  '  style="fill:{{color($index)}}">' +
                  '</rect>' +
                  '<text x="20" y="9" style="text-anchor:top; alignment-baseline:middle;">' +
                    '{{d}}' +
                  '</text>' +
                '</g>',
      scope: {
        data: '=',
      },
      require: '?^graphArea',
      link: function(scope, elm, attrs, graphArea) {
        scope.color = colors.get;
        scope.$watch(function() {
          if (graphArea) {
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
        width: '=w',
        height: '=h',
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
        scope.$watch('[width,height,legendWidth]', function() {
          scope.margin = {top: 0, right: 40, bottom: 30, left: 50};
          scope.graphWidth = scope.width - scope.margin.left - scope.margin.right - (scope.legendWidth || 0);
          scope.graphHeight = scope.height - scope.margin.top - scope.margin.bottom;
          if (ctrl.graphScope) {
            ctrl.graphScope.width = scope.graphWidth;
            ctrl.graphScope.height = scope.graphHeight;
          }
        }, true);
      },
    };
  })
  .directive("pivotBars", function(colors) {
    return {
      restrict: 'E',
      templateUrl: 'src/templates/bars.html',
      replace: true,
      scope: {
        data: '=',
        width: '=?',
        height: '=?',
      },
      require: '?^graphArea',
      link: function(scope, elm, attrs, graphArea) {
        if (graphArea) {
          graphArea.setGraphArea(scope);
        }
        scope.margin = 50;
        scope.$watch('[data, width, height]', function() {
          var pts = scope.data.data;
          var allY = _(pts).map('y').flatten();
          scope.x = d3.scale.ordinal()
            .rangeRoundBands([0, scope.width - scope.margin], 0.1)
            .domain(_.map(pts, 'x'));
          scope.x0 = d3.scale.ordinal()
            .rangeRoundBands([0, scope.x.rangeBand()])
            .domain(d3.range(_(pts).map('y').map('length').max()));
          scope.y = d3.scale.linear()
            .range([scope.height, 10])
            .domain([Math.min(0, allY.min()), allY.max()]).nice();
          scope.color = colors.get;
          scope.abs = Math.abs;
          scope.max = Math.max;
        }, true);
      },
    };
  })
  .directive("pivotPie", function(colors) {
    return {
      restrict: 'E',
      templateUrl: 'src/templates/pie.html',
      replace: true,
      scope: {
        data: '=',
        width: '=?',
        height: '=?',
      },
      require: '?^graphArea',
      link: function(scope, elm, attrs, graphArea) {
        if (graphArea) {
          graphArea.setGraphArea(scope);
        }
        scope.$watch('[data, width, height]', function() {
          var d3arc = d3.svg.arc().outerRadius(Math.min(scope.width, scope.height)/2);
          var pie = d3.layout.pie()(_.map(scope.data.data, function(d) { return d.y[0]; }));
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
  .directive("bars", function() {
    return {
      restrict: 'E',
      templateUrl: 'partials/bars.html',
      scope: {
        data: '=',
        selector: '=',
        x: '=?xscale',
        y: '=?yscale',
        formatter: '=',
        showDiff: '=',
        smallerIsBetter: '=',
      },
      replace: true,
      link: function(scope, elm, attrs, ctrl) {
        scope.barHeight = 30;
        var hovered = null;
        scope.diff = function(datum) {
          if (!hovered || hovered == datum || !scope.showDiff)
            return null;
          var ref = scope.selector(hovered);
          var x = scope.selector(datum);
          if (typeof ref != "number" || typeof x != "number")
            return null;
          var d = 100 * (x - ref) / ref;
          var neg = scope.smallerIsBetter ? "good" : "bad";
          var pos = scope.smallerIsBetter ? "bad" : "good";
          return {
            str: (d >= 0 ? "+" : "") + d.toFixed(0) + "%",
            class2: (d < 0) ? neg : (d > 0 ? pos : ""),
          };
        };
        scope.mouseover = function(datum, b) {
          hovered = b ? datum : null;
        };
        if (!attrs.xscale) {
          scope.x = d3.scale.linear().range([0, 80]);
          scope.$watch('data', function(data) {
            scope.x.domain([0, d3.max(data, scope.selector)]);
          });
        }
        if (!attrs.yscale) {
          scope.y = d3.scale.ordinal();
          scope.$watch('data', function(data) {
            scope.y.rangeRoundBands([0, data.length * scope.barHeight], 0.1);
          });
        }
      }
    };
  })
  .directive('contenteditable', function($rootScope) {
    return {
      require: 'ngModel',
      link: function(scope, elm, attrs, ctrl) {
        // view -> model
        elm.bind('blur', function() {
          if (elm.html() != ctrl.$viewValue) {
            var d = new Date();
            var start = d.getTime();
            scope.$apply(function() {
              ctrl.$setViewValue(elm.html().replace(/<br>/g, ""));
              $rootScope.$broadcast('contenteditable', scope, elm);
            });
            d = new Date();
            console.log("scope.$apply + $broadcast took " + (d.getTime() - start) + " ms\n");
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
