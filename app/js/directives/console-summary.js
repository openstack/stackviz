'use strict';

var directivesModule = require('./_index.js');

/**
 * @ngInject
 */
function consoleSummary() {

  /**
   * @ngInject
   */
  var controller = function($scope, $attrs, datasetService) {
    $scope.$watch('artifactName', function(artifactName) {
      datasetService.artifact(artifactName, 'console').then(function(response) {
        $scope.console = response.data;
      });
    });
  };

  return {
    restrict: 'EA',
    scope: {
      'artifactName': '='
    },
    controller: controller,
    templateUrl: 'directives/console-summary.html'
  };
}

directivesModule.directive('consoleSummary', consoleSummary);
