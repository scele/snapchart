angular.module('pivotchart.directive', [])
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
  .directive("editableFunction", function() {
    // Augment lodash with a transpose function commonly needed
    // in input data transformations.
    angular.element(document).ready(function() {
      function transpose(x) {
        return _.range(x[0].length).map(function(i) { return _.map(x, function(e) { return e[i]; }); });
      }
      _.mixin({'transpose': transpose});
    });
    return {
      restrict: 'E',
      template: '<div><textarea js-function ui-codemirror="opts" ng-model="scopemodel"></textarea>' + 
          '<div class="alert alert-danger alert-bottom" ng-show="error">{{error}}</div>' +
          '</div>',
      scope: {
        scopemodel: '=ngModel',
        evalThis: '=',
        evalArgs: '=',
      },
      replace: true,
      require: ['editableFunction', 'ngModel'],
      controller: function($scope) {
        this.setSyntaxError = function(err) {
          $scope.error = err;
        };
        this.validate = function(f) {
          $scope.error = undefined;
          if ($scope.evalThis || $scope.evalArgs) {
            try {
              f.apply($scope.evalThis || {}, $scope.evalArgs);
            } catch(e) {
              $scope.error = e.message;
            }
          }
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
            var f = new Function("return " + viewValue)();
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
          } else {
            return modelValue.toString();
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
          var pos = scope.smallerIsBetter ? "bad" : "good"
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
            scope.y.rangeRoundBands([0, data.length * scope.barHeight], .1);
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
