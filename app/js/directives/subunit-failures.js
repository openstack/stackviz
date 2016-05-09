'use strict';

var directivesModule = require('./_index.js');

/**
 * @ngInject
 */
function subunitFailures() {

  /**
   * @ngInject
   */
  var controller = function($scope, $attrs, datasetService) {
    $scope.$watch('artifactName', function(artifactName) {
      datasetService.artifact(artifactName, 'subunit-stats').then(function(response) {
        $scope.stats = response.data;
      });
    });
  };

  return {
    restrict: 'EA',
    scope: {
      'artifactName': '='
    },
    controller: controller,
    templateUrl: 'directives/subunit-failures.html'
  };
}

directivesModule.directive('subunitFailures', subunitFailures);
