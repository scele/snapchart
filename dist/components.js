'use strict';

angular.module('colorpicker.module', [])
    .factory('Helper', function () {
      return {
        closestSlider: function (elem) {
          var matchesSelector = elem.matches || elem.webkitMatchesSelector || elem.mozMatchesSelector || elem.msMatchesSelector;
          if (matchesSelector.bind(elem)('I')) {
            return elem.parentNode;
          }
          return elem;
        },
        getOffset: function (elem, fixedPosition) {
          var
              x = 0,
              y = 0,
              scrollX = 0,
              scrollY = 0;
          while (elem && !isNaN(elem.offsetLeft) && !isNaN(elem.offsetTop)) {
            x += elem.offsetLeft;
            y += elem.offsetTop;
            if (!fixedPosition && elem.tagName === 'BODY') {
              scrollX += document.documentElement.scrollLeft || elem.scrollLeft;
              scrollY += document.documentElement.scrollTop || elem.scrollTop;
            } else {
              scrollX += elem.scrollLeft;
              scrollY += elem.scrollTop;
            }
            elem = elem.offsetParent;
          }
          return {
            top: y,
            left: x,
            scrollX: scrollX,
            scrollY: scrollY
          };
        },
        // a set of RE's that can match strings and generate color tuples. https://github.com/jquery/jquery-color/
        stringParsers: [
          {
            re: /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,
            parse: function (execResult) {
              return [
                execResult[1],
                execResult[2],
                execResult[3],
                execResult[4]
              ];
            }
          },
          {
            re: /rgba?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,
            parse: function (execResult) {
              return [
                2.55 * execResult[1],
                2.55 * execResult[2],
                2.55 * execResult[3],
                execResult[4]
              ];
            }
          },
          {
            re: /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/,
            parse: function (execResult) {
              return [
                parseInt(execResult[1], 16),
                parseInt(execResult[2], 16),
                parseInt(execResult[3], 16)
              ];
            }
          },
          {
            re: /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/,
            parse: function (execResult) {
              return [
                parseInt(execResult[1] + execResult[1], 16),
                parseInt(execResult[2] + execResult[2], 16),
                parseInt(execResult[3] + execResult[3], 16)
              ];
            }
          }
        ]
      };
    })
    .factory('Color', ['Helper', function (Helper) {
      return {
        value: {
          h: 1,
          s: 1,
          b: 1,
          a: 1
        },
        // translate a format from Color object to a string
        'rgb': function () {
          var rgb = this.toRGB();
          return 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
        },
        'rgba': function () {
          var rgb = this.toRGB();
          return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + rgb.a + ')';
        },
        'hex': function () {
          return  this.toHex();
        },

        // HSBtoRGB from RaphaelJS
        RGBtoHSB: function (r, g, b, a) {
          r /= 255;
          g /= 255;
          b /= 255;

          var H, S, V, C;
          V = Math.max(r, g, b);
          C = V - Math.min(r, g, b);
          H = (C === 0 ? null :
              V == r ? (g - b) / C :
                  V == g ? (b - r) / C + 2 :
                      (r - g) / C + 4
              );
          H = ((H + 360) % 6) * 60 / 360;
          S = C === 0 ? 0 : C / V;
          return {h: H || 1, s: S, b: V, a: a || 1};
        },

        //parse a string to HSB
        setColor: function (val) {
          val = val.toLowerCase();
          for (var key in Helper.stringParsers) {
            if (Helper.stringParsers.hasOwnProperty(key)) {
              var parser = Helper.stringParsers[key];
              var match = parser.re.exec(val),
                  values = match && parser.parse(match),
                  space = parser.space || 'rgba';
              if (values) {
                this.value = this.RGBtoHSB.apply(null, values);
                return false;
              }
            }
          }
        },

        setHue: function (h) {
          this.value.h = 1 - h;
        },

        setSaturation: function (s) {
          this.value.s = s;
        },

        setLightness: function (b) {
          this.value.b = 1 - b;
        },

        setAlpha: function (a) {
          this.value.a = parseInt((1 - a) * 100, 10) / 100;
        },

        // HSBtoRGB from RaphaelJS
        // https://github.com/DmitryBaranovskiy/raphael/
        toRGB: function (h, s, b, a) {
          if (!h) {
            h = this.value.h;
            s = this.value.s;
            b = this.value.b;
          }
          h *= 360;
          var R, G, B, X, C;
          h = (h % 360) / 60;
          C = b * s;
          X = C * (1 - Math.abs(h % 2 - 1));
          R = G = B = b - C;

          h = ~~h;
          R += [C, X, 0, 0, X, C][h];
          G += [X, C, C, X, 0, 0][h];
          B += [0, 0, X, C, C, X][h];
          return {
            r: Math.round(R * 255),
            g: Math.round(G * 255),
            b: Math.round(B * 255),
            a: a || this.value.a
          };
        },

        toHex: function (h, s, b, a) {
          var rgb = this.toRGB(h, s, b, a);
          return '#' + ((1 << 24) | (parseInt(rgb.r, 10) << 16) | (parseInt(rgb.g, 10) << 8) | parseInt(rgb.b, 10)).toString(16).substr(1);
        }
      };
    }])
    .factory('Slider', ['Helper', function (Helper) {
      var
          slider = {
            maxLeft: 0,
            maxTop: 0,
            callLeft: null,
            callTop: null,
            knob: {
              top: 0,
              left: 0
            }
          },
          pointer = {};

      return {
        getSlider: function() {
          return slider;
        },
        getLeftPosition: function(event) {
          return Math.max(0, Math.min(slider.maxLeft, slider.left + ((event.pageX || pointer.left) - pointer.left)));
        },
        getTopPosition: function(event) {
          return Math.max(0, Math.min(slider.maxTop, slider.top + ((event.pageY || pointer.top) - pointer.top)));
        },
        setSlider: function (event, fixedPosition) {
          var
            target = Helper.closestSlider(event.target),
            targetOffset = Helper.getOffset(target, fixedPosition);
          slider.knob = target.children[0].style;
          slider.left = event.pageX - targetOffset.left - window.pageXOffset + targetOffset.scrollX;
          slider.top = event.pageY - targetOffset.top - window.pageYOffset + targetOffset.scrollY;

          pointer = {
            left: event.pageX,
            top: event.pageY
          };
        },
        setSaturation: function(event, fixedPosition) {
          slider = {
            maxLeft: 100,
            maxTop: 100,
            callLeft: 'setSaturation',
            callTop: 'setLightness'
          };
          this.setSlider(event, fixedPosition)
        },
        setHue: function(event, fixedPosition) {
          slider = {
            maxLeft: 0,
            maxTop: 100,
            callLeft: false,
            callTop: 'setHue'
          };
          this.setSlider(event, fixedPosition)
        },
        setAlpha: function(event, fixedPosition) {
          slider = {
            maxLeft: 0,
            maxTop: 100,
            callLeft: false,
            callTop: 'setAlpha'
          };
          this.setSlider(event, fixedPosition)
        },
        setKnob: function(top, left) {
          slider.knob.top = top + 'px';
          slider.knob.left = left + 'px';
        }
      };
    }])
    .directive('colorpicker', ['$document', '$compile', 'Color', 'Slider', 'Helper', function ($document, $compile, Color, Slider, Helper) {
      return {
        require: '?ngModel',
        restrict: 'A',
        link: function ($scope, elem, attrs, ngModel) {
          var
              thisFormat = attrs.colorpicker ? attrs.colorpicker : 'hex',
              position = angular.isDefined(attrs.colorpickerPosition) ? attrs.colorpickerPosition : 'bottom',
              fixedPosition = angular.isDefined(attrs.colorpickerFixedPosition) ? attrs.colorpickerFixedPosition : false,
              target = angular.isDefined(attrs.colorpickerParent) ? elem.parent() : angular.element(document.body),
              withInput = angular.isDefined(attrs.colorpickerWithInput) ? attrs.colorpickerWithInput : false,
              inputTemplate = withInput ? '<input type="text" name="colorpicker-input">' : '',
              template =
                  '<div class="colorpicker dropdown">' +
                      '<div class="dropdown-menu">' +
                      '<colorpicker-saturation><i></i></colorpicker-saturation>' +
                      '<colorpicker-hue><i></i></colorpicker-hue>' +
                      '<colorpicker-alpha><i></i></colorpicker-alpha>' +
                      '<colorpicker-preview></colorpicker-preview>' +
                      inputTemplate +
                      '<button class="close close-colorpicker">&times;</button>' +
                      '</div>' +
                      '</div>',
              colorpickerTemplate = angular.element(template),
              pickerColor = Color,
              sliderAlpha,
              sliderHue = colorpickerTemplate.find('colorpicker-hue'),
              sliderSaturation = colorpickerTemplate.find('colorpicker-saturation'),
              colorpickerPreview = colorpickerTemplate.find('colorpicker-preview'),
              pickerColorPointers = colorpickerTemplate.find('i');

          $compile(colorpickerTemplate)($scope);

          if (withInput) {
            var pickerColorInput = colorpickerTemplate.find('input');
            pickerColorInput
                .on('mousedown', function() {
                  event.stopPropagation();
                })
                .on('keyup', function(event) {
                  var newColor = this.value;
                  elem.val(newColor);
                  if(ngModel) {
                    $scope.$apply(ngModel.$setViewValue(newColor));
                  }
                  event.stopPropagation();
                  event.preventDefault();
                });
            elem.on('keyup', function() {
              pickerColorInput.val(elem.val());
            });
          }

          var bindMouseEvents = function() {
            $document.on('mousemove', mousemove);
            $document.on('mouseup', mouseup);
          };

          if (thisFormat === 'rgba') {
            colorpickerTemplate.addClass('alpha');
            sliderAlpha = colorpickerTemplate.find('colorpicker-alpha');
            sliderAlpha
                .on('click', function(event) {
                  Slider.setAlpha(event, fixedPosition);
                  mousemove(event);
                })
                .on('mousedown', function(event) {
                  Slider.setAlpha(event, fixedPosition);
                  bindMouseEvents();
                });
          }

          sliderHue
              .on('click', function(event) {
                Slider.setHue(event, fixedPosition);
                mousemove(event);
              })
              .on('mousedown', function(event) {
                Slider.setHue(event, fixedPosition);
                bindMouseEvents();
              });

          sliderSaturation
              .on('click', function(event) {
                Slider.setSaturation(event, fixedPosition);
                mousemove(event);
              })
              .on('mousedown', function(event) {
                Slider.setSaturation(event, fixedPosition);
                bindMouseEvents();
              });

          if (fixedPosition) {
            colorpickerTemplate.addClass('colorpicker-fixed-position');
          }

          colorpickerTemplate.addClass('colorpicker-position-' + position);

          target.append(colorpickerTemplate);

          if(ngModel) {
            ngModel.$render = function () {
              elem.val(ngModel.$viewValue);
            };
            $scope.$watch(attrs.ngModel, function() {
              update();
            });
          }

          elem.on('$destroy', function() {
            colorpickerTemplate.remove();
          });

          var previewColor = function () {
            try {
              colorpickerPreview.css('backgroundColor', pickerColor[thisFormat]());
            } catch (e) {
              colorpickerPreview.css('backgroundColor', pickerColor.toHex());
            }
            sliderSaturation.css('backgroundColor', pickerColor.toHex(pickerColor.value.h, 1, 1, 1));
            if (thisFormat === 'rgba') {
              sliderAlpha.css.backgroundColor = pickerColor.toHex();
            }
          };

          var mousemove = function (event) {
            var
                left = Slider.getLeftPosition(event),
                top = Slider.getTopPosition(event),
                slider = Slider.getSlider();

            Slider.setKnob(top, left);

            if (slider.callLeft) {
              pickerColor[slider.callLeft].call(pickerColor, left / 100);
            }
            if (slider.callTop) {
              pickerColor[slider.callTop].call(pickerColor, top / 100);
            }
            previewColor();
            var newColor = pickerColor[thisFormat]();
            elem.val(newColor);
            if(ngModel) {
              $scope.$apply(ngModel.$setViewValue(newColor));
            }
            if (withInput) {
              pickerColorInput.val(newColor);
            }
            return false;
          };

          var mouseup = function () {
            $document.off('mousemove', mousemove);
            $document.off('mouseup', mouseup);
          };

          var update = function () {
            pickerColor.setColor(elem.val());
            pickerColorPointers.eq(0).css({
              left: pickerColor.value.s * 100 + 'px',
              top: 100 - pickerColor.value.b * 100 + 'px'
            });
            pickerColorPointers.eq(1).css('top', 100 * (1 - pickerColor.value.h) + 'px');
            pickerColorPointers.eq(2).css('top', 100 * (1 - pickerColor.value.a) + 'px');
            previewColor();
          };

          var getColorpickerTemplatePosition = function() {
            var
                positionValue,
                positionOffset = Helper.getOffset(elem[0]);

            if(angular.isDefined(attrs.colorpickerParent)) {
              positionOffset.left = 0;
              positionOffset.top = 0;
            }

            if (position === 'top') {
              positionValue =  {
                'top': positionOffset.top - 147,
                'left': positionOffset.left
              };
            } else if (position === 'right') {
              positionValue = {
                'top': positionOffset.top,
                'left': positionOffset.left + 126
              };
            } else if (position === 'bottom') {
              positionValue = {
                'top': positionOffset.top + elem[0].offsetHeight + 2,
                'left': positionOffset.left
              };
            } else if (position === 'left') {
              positionValue = {
                'top': positionOffset.top,
                'left': positionOffset.left - 150
              };
            }
            return {
              'top': positionValue.top + 'px',
              'left': positionValue.left + 'px'
            };
          };

          var documentMousedownHandler = function() {
            hideColorpickerTemplate();
          };

          elem.on('click', function () {
            update();
            colorpickerTemplate
                .addClass('colorpicker-visible')
                .css(getColorpickerTemplatePosition());

            // register global mousedown event to hide the colorpicker
            $document.on('mousedown', documentMousedownHandler);
          });

          colorpickerTemplate.on('mousedown', function (event) {
            event.stopPropagation();
            event.preventDefault();
          });

          var hideColorpickerTemplate = function() {
            if (colorpickerTemplate.hasClass('colorpicker-visible')) {
              colorpickerTemplate.removeClass('colorpicker-visible');

              // unregister the global mousedown event
              $document.off('mousedown', documentMousedownHandler);
            }
          };

          colorpickerTemplate.find('button').on('click', function () {
            hideColorpickerTemplate();
          });
        }
      };
    }]);
(function(window, angular, undefined) {
'use strict';
/*
 jQuery UI Sortable plugin wrapper

 @param [ui-sortable] {object} Options to pass to $.fn.sortable() merged onto ui.config
 */
angular.module('ui.sortable', [])
  .value('uiSortableConfig',{})
  .directive('uiSortable', [
    'uiSortableConfig', '$timeout', '$log',
    function(uiSortableConfig, $timeout, $log) {
      return {
        require: '?ngModel',
        link: function(scope, element, attrs, ngModel) {
          var savedNodes;

          function combineCallbacks(first,second){
            if(second && (typeof second === 'function')) {
              return function(e, ui) {
                first(e, ui);
                second(e, ui);
              };
            }
            return first;
          }

          function hasSortingHelper (element) {
            var helperOption = element.sortable('option','helper');
            return helperOption === 'clone' || typeof helperOption === 'function';
          }

          var opts = {};

          var callbacks = {
            receive: null,
            remove:null,
            start:null,
            stop:null,
            update:null
          };

          angular.extend(opts, uiSortableConfig);

          if (!angular.element.fn || !angular.element.fn.jquery) {
            $log.error('ui.sortable: jQuery should be included before AngularJS!');
            return;
          }

          if (ngModel) {

            // When we add or remove elements, we need the sortable to 'refresh'
            // so it can find the new/removed elements.
            scope.$watch(attrs.ngModel+'.length', function() {
              // Timeout to let ng-repeat modify the DOM
              $timeout(function() {
                // ensure that the jquery-ui-sortable widget instance
                // is still bound to the directive's element
                if (!!element.data('ui-sortable')) {
                  element.sortable('refresh');
                }
              });
            });

            callbacks.start = function(e, ui) {
              // Save the starting position of dragged item
              ui.item.sortable = {
                index: ui.item.index(),
                cancel: function () {
                  ui.item.sortable._isCanceled = true;
                },
                isCanceled: function () {
                  return ui.item.sortable._isCanceled;
                },
                _isCanceled: false
              };
            };

            callbacks.activate = function(/*e, ui*/) {
              // We need to make a copy of the current element's contents so
              // we can restore it after sortable has messed it up.
              // This is inside activate (instead of start) in order to save
              // both lists when dragging between connected lists.
              savedNodes = element.contents();

              // If this list has a placeholder (the connected lists won't),
              // don't inlcude it in saved nodes.
              var placeholder = element.sortable('option','placeholder');

              // placeholder.element will be a function if the placeholder, has
              // been created (placeholder will be an object).  If it hasn't
              // been created, either placeholder will be false if no
              // placeholder class was given or placeholder.element will be
              // undefined if a class was given (placeholder will be a string)
              if (placeholder && placeholder.element && typeof placeholder.element === 'function') {
                var phElement = placeholder.element();
                // workaround for jquery ui 1.9.x,
                // not returning jquery collection
                phElement = angular.element(phElement);

                // exact match with the placeholder's class attribute to handle
                // the case that multiple connected sortables exist and
                // the placehoilder option equals the class of sortable items
                var excludes = element.find('[class="' + phElement.attr('class') + '"]');

                savedNodes = savedNodes.not(excludes);
              }
            };

            callbacks.update = function(e, ui) {
              // Save current drop position but only if this is not a second
              // update that happens when moving between lists because then
              // the value will be overwritten with the old value
              if(!ui.item.sortable.received) {
                ui.item.sortable.dropindex = ui.item.index();
                ui.item.sortable.droptarget = ui.item.parent();

                // Cancel the sort (let ng-repeat do the sort for us)
                // Don't cancel if this is the received list because it has
                // already been canceled in the other list, and trying to cancel
                // here will mess up the DOM.
                element.sortable('cancel');
              }

              // Put the nodes back exactly the way they started (this is very
              // important because ng-repeat uses comment elements to delineate
              // the start and stop of repeat sections and sortable doesn't
              // respect their order (even if we cancel, the order of the
              // comments are still messed up).
              if (savedNodes.last().hasClass('ui-sortable-helper')) {
                // restore all the savedNodes except .ui-sortable-helper element
                // (which is placed last). That way it will be garbage collected.
                savedNodes = savedNodes.not(savedNodes.last());
              }
              savedNodes.appendTo(element);

              // If received is true (an item was dropped in from another list)
              // then we add the new item to this list otherwise wait until the
              // stop event where we will know if it was a sort or item was
              // moved here from another list
              if(ui.item.sortable.received && !ui.item.sortable.isCanceled()) {
                scope.$apply(function () {
                  ngModel.$modelValue.splice(ui.item.sortable.dropindex, 0,
                                             ui.item.sortable.moved);
                });
              }
            };

            callbacks.stop = function(e, ui) {
              // If the received flag hasn't be set on the item, this is a
              // normal sort, if dropindex is set, the item was moved, so move
              // the items in the list.
              if(!ui.item.sortable.received &&
                 ('dropindex' in ui.item.sortable) &&
                 !ui.item.sortable.isCanceled()) {

                scope.$apply(function () {
                  ngModel.$modelValue.splice(
                    ui.item.sortable.dropindex, 0,
                    ngModel.$modelValue.splice(ui.item.sortable.index, 1)[0]);
                });
              } else {
                // if the item was not moved, then restore the elements
                // so that the ngRepeat's comment are correct.
                if ((!('dropindex' in ui.item.sortable) || ui.item.sortable.isCanceled()) &&
                    !hasSortingHelper(element) && !ui.item.sortable.deleted) {
                  savedNodes.appendTo(element);
                }
              }
            };

            callbacks.receive = function(e, ui) {
              // An item was dropped here from another list, set a flag on the
              // item.
              ui.item.sortable.received = true;
            };

            callbacks.remove = function(e, ui) {
              // Remove the item from this list's model and copy data into item,
              // so the next list can retrive it
              if (!ui.item.sortable.isCanceled()) {
                scope.$apply(function () {
                  if (element.sortable('option', 'copy')) {
                    ui.item.sortable.moved = ngModel.$modelValue[ui.item.sortable.index];
                  } else {
                    ui.item.sortable.moved = ngModel.$modelValue.splice(
                      ui.item.sortable.index, 1)[0];
                  }
                });
              }
            };

            scope.$watch(attrs.uiSortable, function(newVal /*, oldVal*/) {
              // ensure that the jquery-ui-sortable widget instance
              // is still bound to the directive's element
              if (!!element.data('ui-sortable')) {
                angular.forEach(newVal, function(value, key) {
                  if(callbacks[key]) {
                    if( key === 'stop' ){
                      // call apply after stop
                      value = combineCallbacks(
                        value, function() { scope.$apply(); });
                    }
                    // wrap the callback
                    value = combineCallbacks(callbacks[key], value);
                  }
                  
                  element.sortable('option', key, value);
                });
              }
            }, true);

            angular.forEach(callbacks, function(value, key) {
              opts[key] = combineCallbacks(value, opts[key]);
            });

          } else {
            $log.info('ui.sortable: ngModel not provided!', element);
          }

          // Create sortable
          element.sortable(opts);
        }
      };
    }
  ]);

})(window, window.angular);
