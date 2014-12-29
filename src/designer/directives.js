angular.module('snapchart.designer.directives', [])
  .directive("pivotColumnContainer", function(input) {
    return {
      restrict: 'EA',
      templateUrl: 'src/designer/templates/columnContainer.html',
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
      templateUrl: 'src/designer/templates/column.html',
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
