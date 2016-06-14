'use strict';

var directivesModule = require('./_index.js');

/**
 * @ngInject
 */
function timelineDetails(AppSettings) {

  /**
   * @ngInject
   */
  var controller = function($scope) {
    $scope.healthRoot = AppSettings.healthRoot;
  };

  return {
    restrict: 'EA',
    scope: {
      'artifactName': '=',
      'item': '='
    },
    controller: controller,
    templateUrl: 'directives/timeline-details.html'
  };
}

directivesModule.directive('timelineDetails', timelineDetails);
