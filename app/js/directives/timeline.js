'use strict';

var directivesModule = require('./_index.js');

var arrayUtil = require('../util/array-util');
var parseDstat = require('../util/dstat-parse');
var d3 = require('d3');

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

    return parseInt(tags[i].split('-')[1]);
  }

  return null;
};

/**
 * @ngInject
 */
function timeline($log, datasetService) {

  /**
   * @ngInject
   */
  var controller = function($scope) {
    var self = this;
    self.statusColorMap = statusColorMap;

    self.data = [];
    self.dataRaw = [];
    self.dstat = [];

    self.margin = { top: 40, right: 10, bottom: 10, left: 80 };
    self.width = 0;
    self.height = 550 - this.margin.top - this.margin.bottom;

    self.timeExtents = [0, 0];
    self.viewExtents = [0, 0];
    self.axes = {
      x: d3.time.scale(),
      selection: d3.scale.linear()
    };

    self.selectionName = null;
    self.selection = null;
    self.hover = null;

    self.setViewExtents = function(extents) {
      if (angular.isNumber(extents[0])) {
        extents[0] = new Date(extents[0]);
      }

      if (angular.isNumber(extents[1])) {
        extents[1] = new Date(extents[1]);
      }

      self.viewExtents = extents;
      self.axes.selection.domain(extents);

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

      self.data = d3.nest()
          .key(function(d) { return d.worker; })
          .sortKeys(d3.ascending)
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

      self.dstat = {
        entries: raw.entries.slice(minIndex, maxIndex),
        minimums: raw.minimums,
        maximums: raw.maximums
      };

      $scope.$broadcast('dstatLoaded', self.dstat);
    };

    $scope.$watch('dataset', function(dataset) {
      if (!dataset) {
        return;
      }

      // load dataset details (raw log entries and dstat) sequentially
      // we need to determine the initial date from the subunit data to parse
      // dstat
      datasetService.raw(dataset).then(function(response) {
        initData(response.data);

        return datasetService.dstat(dataset);
      }).then(function(response) {
        var firstDate = new Date(self.dataRaw[0].timestamps[0]);

        var raw = parseDstat(response.data, firstDate.getYear());
        initDstat(raw);

        $scope.$broadcast('update');
      }).catch(function(ex) {
        $log.error(ex);
      });
    });

    $scope.$watch(function() { return self.width; }, function(width) {
      self.axes.x.range([0, width]);
      self.axes.selection.range([0, width]);

      $scope.$broadcast('update');
    });
  };

  var link = function(scope, el, attrs, ctrl) {
    var updateWidth = function() {
      ctrl.width = el.parent()[0].clientWidth -
          ctrl.margin.left -
          ctrl.margin.right;
    };

    scope.$on('windowResize', updateWidth);
    updateWidth();

    d3.select(window)
      .on("keydown", function() {
        var code = d3.event.keyCode;
        if (code == 37) {
          ctrl.selectPreviousItem();
        }
        else if (code == 39) {
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
    template: '<ng-transclude></ng-transclude>',
    scope: {
      'dataset': '=',
      'hoveredItem': '=',
      'selectedItem': '=',
      'preselect': '='
    },
    link: link
  };
}

directivesModule.directive('timeline', timeline);
