'use strict';

var directivesModule = require('./_index.js');

/**
 * @ngInject
 */
function subunitSummary() {

  /**
   * Responsible for getting the basic run summary stats via the dataset service.
   * Also calculates the duration of the run - `timeDiff` - by subtracting the
   * run's start and end timestamps.
   * @ngInject
   */
  var controller = function($scope, $attrs, datasetService) {
    $scope.$watch('artifactName', function(artifactName) {
      datasetService.artifact(artifactName, 'subunit-stats').then(function(response) {
        var stats = response.data;
        $scope.stats = stats;
        $scope.timeDiff = (new Date(stats.end) - new Date(stats.start)) / 1000;
      });
    });
  };

  return {
    restrict: 'EA',
    scope: {
      'artifactName': '='
    },
    controller: controller,
    templateUrl: 'directives/subunit-summary.html'
  };
}

directivesModule.directive('subunitSummary', subunitSummary);
