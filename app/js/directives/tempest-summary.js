'use strict';

var directivesModule = require('./_index.js');

/**
 * @ngInject
 */
function tempestSummary() {

  /**
   * @ngInject
   */
  var controller =
  /**
   * Responsible for getting the basic run summary stats via the dataset service.
   * Also calculates the duration of the run - `timeDiff` - by subtracting the
   * run's start and end timestamps.
   */
  function($scope, $attrs, datasetService) {
    $scope.$watch('dataset', function(dataset) {
      var stats = dataset.stats;
      $scope.stats = stats;
      $scope.timeDiff = (new Date(stats.end) - new Date(stats.start)) / 1000;
    });
  };

  return {
    restrict: 'EA',
    scope: {
      'dataset': '='
    },
    controller: controller,
    templateUrl: 'directives/tempest-summary.html'
  };
}

directivesModule.directive('tempestSummary', tempestSummary);
