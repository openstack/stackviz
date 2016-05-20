'use strict';

var directivesModule = require('./_index.js');

var arrayUtil = require('../util/array-util');
var parseDstat = require('../util/dstat-parse');

var d3Array = require('d3-array');
var d3Collection = require('d3-collection');
var d3Scale = require('d3-scale');

var statusColorMap = {
  'success': 'LightGreen',
  'fail': 'Crimson',
  'skip': 'DodgerBlue',
  'selected': 'GoldenRod',
  'hover': 'DarkTurquoise'
};

var parseWorker = function(tags) {
  for (var i = 0; i < tags.length; i++) {
    if (!tags[i].startsWith('worker')) {
      continue;
    }

    return parseInt(tags[i].split('-')[1], 10);
  }

  return null;
};

/**
 * @ngInject
 */
function timeline($window, $log, datasetService, progressService) {

  /**
   * @ngInject
   */
  var controller = function($scope) {
    var self = this;
    self.statusColorMap = statusColorMap;

    self.data = [];
    self.dataRaw = [];
    self.dstat = [];

    self.margin = { top: 40, right: 10, bottom: 20, left: 80 };
    self.width = 0;
    self.height = 550 - this.margin.top - this.margin.bottom;

    /**
     * The date extents of all chart entries.
     */
    self.timeExtents = [0, 0];

    /**
     * The date extents of the current viewport.
     */
    self.viewExtents = [0, 0];
    self.axes = {
      /**
       * The primary axis mapping date to on-screen x. The lower time bound maps
       * to x=0, while the upper time bound maps to x=width.
       */
      x: d3Scale.scaleTime(),

      /**
       * The selection axis, mapping date to on-screen x, depending on the size
       * and position of the user selection. `selection(viewExtents[0]) = 0`,
       * while `selection(viewExtents[1]) = width`
       */
      selection: d3Scale.scaleLinear(),

      /**
       * The absolute x axis mapping date to virtual x, depending only on the
       * size (but not position) of the user selection.
       * `absolute(timeExtents[0]) = 0`, while `absolute(timeExtents[1])` will
       * be the total width at the current scale, spanning as many
       * viewport-widths as necessary.
       */
      absolute: d3Scale.scaleLinear()
    };

    self.selectionName = null;
    self.selection = null;
    self.hover = null;
    self.filterFunction = null;

    self.animateId = null;
    self.animateCallbacks = [];

    self.setViewExtents = function(extents) {
      if (extents[0] instanceof Date) {
        extents[0] = +extents[0];
      }

      if (extents[1] instanceof Date) {
        extents[1] = +extents[1];
      }

      var oldSize = self.viewExtents[1] - self.viewExtents[0];
      var newSize = extents[1] - extents[0];

      self.viewExtents = extents;
      self.axes.selection.domain(extents);

      // slight hack: d3 extrapolates by default, and these scales are identical
      // when the lower bound is zero, so just keep absolute's domain at
      // [0, selectionWidth]
      self.axes.absolute.domain([
        +self.timeExtents[0],
        +self.timeExtents[0] + newSize
      ]);

      if (Math.abs(oldSize - newSize) > 1) {
        $scope.$broadcast('updateViewSize');
      } else {
        $scope.$broadcast('updateViewPosition');
      }

      $scope.$broadcast('updateView');
    };

    self.setHover = function(item) {
      self.hover = item;
      $scope.hoveredItem = item;
    };

    self.clearHover = function() {
      self.hover = null;
      $scope.hoveredItem = null;
    };

    self.setSelection = function(index, item) {
      if (self.selection && self.selection.item.name === item.name) {
        self.selectionName = null;
        self.selection = null;
        $scope.selectedItem = null;
      } else {
        self.selectionName = item.name;
        self.selection = {
          item: item,
          index: index
        };
        $scope.selectedItem = item;
      }

      // selection in the viewport depends on the overview setting the view
      // extents & makings sure there is a visible rect to select
      // the postSelect event makes sure that this is handled in the correct
      // sequence
      $scope.$broadcast('select', self.selection);
      $scope.$broadcast('postSelect', self.selection);
    };

    self.setFilterFunction = function(fn) {
      self.filterFunction = fn;

      $scope.$broadcast('filter', fn);
    };

    self.selectItem = function(item) {
      var workerItems = self.data[item.worker].values;
      var index = -1;

      workerItems.forEach(function(d, i) {
        if (d.name === item.name) {
          index = i;
        }
      });

      if (index === -1) {
        return false;
      }

      self.setSelection(index, item);
      return true;
    };

    self.selectIndex = function(worker, index) {
      var item = self.data[worker].values[index];

      self.setSelection(index, item);
      return true;
    };

    self.clearSelection = function() {
      self.selection = null;
      $scope.$broadcast('select', null);
    };

    self.selectNextItem = function() {
      if (self.selection) {
        var worker = self.selection.item.worker;
        if (self.selection.index < self.data[worker].values.length - 1) {
          self.selectIndex(worker, (self.selection.index) + 1);
          return true;
        }
      }
      return false;
    };

    self.selectPreviousItem = function() {
      if (self.selection) {
        var worker = self.selection.item.worker;
        if (self.selection.index > 0) {
          self.selectIndex(worker, (self.selection.index) - 1);
          return true;
        }
      }
      return false;
    };

    self.hidden = function(item) {
      var width = self.axes.selection(item.endDate) -
          self.axes.selection(item.startDate);
      var hidden = width < 2;
      item.hidden = hidden;

      return hidden;
    };

    /**
     * Get all raw data that at least partially fall within the given bounds;
     * that is, data points with an end date greater than the minimum bound, and
     * an end date less than the maximum bound. Note that returned data will
     * be a flat array, i.e. not grouped by worker.
     * @param  {Date} min the lower date bound
     * @param  {Date} max the upper date bound
     * @return {Array}    all matching data points
     */
    self.dataInBounds = function(min, max) {
      return self.dataRaw.filter(function(d) {
        return (+d.endDate) > (+min) && (+d.startDate) < (+max);
      });
    };

    /**
     * Gets all dstat entries within the given bounds.
     * @param  {Date} min the lower time bound
     * @param  {Date} max the upper time bound
     * @return {Array}    a list of dstat entries within the given bounds
     */
    self.dstatInBounds = function(min, max) {
      var entries = self.dstat.entries;
      var timeFunc = function(d) { return d.system_time; };
      return entries.slice(
        arrayUtil.binaryMinIndex(min, entries, timeFunc),
        arrayUtil.binaryMaxIndex(max, entries, timeFunc) + 1
      );
    };

    /**
     * Creates an empty canvas with the specified width and height, returning
     * the element and its 2d context. The element will not be appended to the
     * document and may be used for offscreen rendering.
     * @param  {number} [w]  the canvas width in px, or null
     * @param  {number} [h]  the canvas height in px, or null
     * @return {object}      an object containing the canvas and its 2d context
     */
    self.createCanvas = function(w, h, scale) {
      w = w || self.width + self.margin.left + self.margin.right;
      h = h || 200 + self.margin.top + self.margin.bottom;
      if (typeof scale === 'undefined') {
        scale = true;
      }

      /** @type {HTMLCanvasElement} */
      var canvas = angular.element('<canvas>')[0];
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      /** @type {CanvasRenderingContext2D} */
      var ctx = canvas.getContext('2d');
      var devicePixelRatio = $window.devicePixelRatio || 1;
      var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
          ctx.mozBackingStorePixelRatio ||
          ctx.msBackingStorePixelRatio ||
          ctx.oBackingStorePixelRatio ||
          ctx.backingStorePixelRatio || 1;
      var ratio = devicePixelRatio / backingStoreRatio;

      canvas.width = w * ratio;
      canvas.height = h * ratio;

      if (scale) {
        ctx.scale(ratio, ratio);
      }

      var resize = function(w) {
        canvas.width = w * ratio;
        canvas.style.width = w + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (scale) {
          ctx.scale(ratio, ratio);
        }
      };

      return {
        canvas: canvas, ctx: ctx,
        scale: scale, ratio: ratio, resize: resize
      };
    };

    /**
     * Request an animation frame from the browser, and call all regsitered
     * animation callbacks when it occurs. If an animation has already been
     * requested but has not completed, this method will return immediately.
     */
    self.animate = function() {
      if (self.animateId) {
        return;
      }

      var _animate = function(timestamp) {
        var again = false;

        for (var i = 0; i < self.animateCallbacks.length; i++) {
          if (self.animateCallbacks[i](timestamp)) {
            again = true;
          }
        }

        if (again) {
          self.animateId = requestAnimationFrame(_animate);
        } else {
          self.animateId = null;
        }
      };

      self.animateId = requestAnimationFrame(_animate);
    };

    var initData = function(raw) {
      self.dataRaw = raw;

      var minStart = null;
      var maxEnd = null;
      var preselect = null;

      // parse date strings and determine extents
      raw.forEach(function(d) {
        d.worker = parseWorker(d.tags);

        d.startDate = new Date(d.timestamps[0]);
        if (minStart === null || d.startDate < minStart) {
          minStart = d.startDate;
        }

        d.endDate = new Date(d.timestamps[1]);
        if (maxEnd === null || d.endDate > maxEnd) {
          maxEnd = d.endDate;
        }

        if ($scope.preselect && d.name === $scope.preselect) {
          preselect = d;
        }
      });

      self.timeExtents = [ minStart, maxEnd ];

      self.data = d3Collection.nest()
          .key(function(d) { return d.worker; })
          .sortKeys(d3Array.ascending)
          .entries(raw.filter(function(d) { return d.duration > 0; }));

      self.axes.x.domain(self.timeExtents);

      $scope.$broadcast('dataLoaded', self.data);

      if (preselect) {
        self.selectItem(preselect);
      }
    };

    var initDstat = function(raw) {
      var min = self.timeExtents[0];
      var max = self.timeExtents[1];

      var accessor = function(d) { return d.system_time; };
      var minIndex = arrayUtil.binaryMinIndex(min, raw.entries, accessor);
      var maxIndex = arrayUtil.binaryMaxIndex(max, raw.entries, accessor);
      if (minIndex < 0) {
        minIndex = 0;
      }

      self.dstat = {
        entries: raw.entries.slice(minIndex, maxIndex),
        minimums: raw.minimums,
        maximums: raw.maximums
      };

      $scope.$broadcast('dstatLoaded', self.dstat);
    };

    $scope.$watch('artifactName', function(artifactName) {
      if (!artifactName) {
        return;
      }

      progressService.start({ parent: 'timeline .panel-body' });

      // load dataset details (raw log entries and dstat) sequentially
      // we need to determine the initial date from the subunit data to parse
      // dstat
      datasetService.artifact(artifactName, 'subunit').then(function(response) {
        progressService.set(0.33);
        initData(response.data);

        return datasetService.artifact('dstat');
      }).then(function(response) {
        progressService.set(0.66);
        var firstDate = new Date(self.dataRaw[0].timestamps[0]);

        var raw = parseDstat(response.data, firstDate.getYear());
        initDstat(raw);
      }).catch(function(ex) {
        $log.warn(ex);
      }).finally(function() {
        $scope.$broadcast('update');
        progressService.done();
      });
    });

    $scope.$watch(function() { return self.width; }, function(width) {
      self.axes.x.range([0, width]);
      self.axes.selection.range([0, width]);
      self.axes.absolute.range([0, width]);

      $scope.$broadcast('update');
    });
  };

  var link = function(scope, el, attrs, ctrl) {
    var updateWidth = function() {
      var body = el[0].querySelector('div.panel div.panel-body');
      var style = getComputedStyle(body);

      ctrl.width = body.clientWidth -
          ctrl.margin.left -
          ctrl.margin.right -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight);
    };

    scope.$on('windowResize', updateWidth);
    updateWidth();

    $window.addEventListener('keydown', function(evt) {
      if (evt.keyCode === 37) {
        ctrl.selectPreviousItem();
      }
      if (evt.keyCode === 39) {
        ctrl.selectNextItem();
      }

      scope.$apply();
    });
  };

  return {
    controller: controller,
    controllerAs: 'timeline',
    restrict: 'EA',
    transclude: true,
    templateUrl: 'directives/timeline.html',
    scope: {
      'artifactName': '=',
      'hoveredItem': '=',
      'selectedItem': '=',
      'preselect': '='
    },
    link: link
  };
}

directivesModule.directive('timeline', timeline);
