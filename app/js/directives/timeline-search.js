'use strict';

var directivesModule = require('./_index.js');

/**
 * @ngInject
 */
function timelineSearch() {

  /**
   * @ngInject
   */
  var controller = function($scope, $element) {
    var self = this;

    this.open = false;
    this.query = '';
    this.showSuccess = true;
    this.showSkip = true;
    this.showFail = true;

    this.results = [];

    var doFilter = function(item) {
      if ((item.status === 'success' && !self.showSuccess) ||
          (item.status === 'skip' && !self.showSkip) ||
          (item.status === 'fail' && !self.showFail)) {
        return false;
      }

      if (item.name.toLowerCase().indexOf(self.query.toLowerCase()) < 0) {
        return false;
      }

      return true;
    };

    this.updateResults = function() {
      var timeline = $element.controller('timeline');
      timeline.setFilterFunction(function(item) {
        return doFilter(item);
      });

      var ret = [];
      for (var i = 0; i < timeline.dataRaw.length; i++) {
        var item = timeline.dataRaw[i];

        if (!doFilter(item)) {
          continue;
        }

        ret.push(timeline.dataRaw[i]);
        if (ret.length > 25) {
          break;
        }
      }

      this.results = ret;
    };

    this.select = function(item) {
      var timeline = $element.controller('timeline');
      timeline.selectItem(item);
      timeline.setFilterFunction(null);

      self.query = '';
      self.open = false;
    };

    var update = function(a, b) {
      if (a === b) {
        return;
      }

      self.updateResults();
    };

    $scope.$watch(function() { return self.query; }, update);
    $scope.$watch(function() { return self.showSuccess; }, update);
    $scope.$watch(function() { return self.showSkip; }, update);
    $scope.$watch(function() { return self.showFail; }, update);

    $scope.$on('dataLoaded', function() {
      self.updateResults();
    });
  };

  return {
    restrict: 'EA',
    require: ['^timelineSearch', '^timeline'],
    scope: true,
    controller: controller,
    controllerAs: 'search',
    templateUrl: 'directives/timeline-search.html'
  };
}

directivesModule.directive('timelineSearch', timelineSearch);
