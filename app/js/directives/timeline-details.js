'use strict';

var directivesModule = require('./_index.js');

/**
 * @ngInject
 */
function timelineDetails() {

  /**
   * @ngInject
   */
  var controller = function($scope) {
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
