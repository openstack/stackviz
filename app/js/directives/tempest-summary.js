'use strict';

var directivesModule = require('./_index.js');

/**
 * @ngInject
 */
function tempestSummary() {

  /**
   * @ngInject
   */
  var controller = function($scope, $attrs, datasetService) {
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
