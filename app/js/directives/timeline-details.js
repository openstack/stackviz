'use strict';

var directivesModule = require('./_index.js');

/**
 * @ngInject
 */
function timelineDetails() {
  var controller = function($scope) {
    $scope.item = null;

    $scope.$watch('hoveredItem', function(value) {
      if (value && !$scope.selectedItem) {
        $scope.item = value;
      } else if (!value && !$scope.selectedItem) {
        $scope.item = null;
      }
    });

    $scope.$watch('selectedItem', function(value) {
      if (value) {
        $scope.item = value;
      } else {
        if ($scope.hoveredItem) {
          $scope.item = $scope.hoveredItem;
        } else {
          $scope.item = null;
        }
      }
    });
  };

  return {
    restrict: 'EA',
    scope: {
      'hoveredItem': '=',
      'selectedItem': '='
    },
    controller: controller,
    templateUrl: 'directives/timeline-details.html'
  };
}

directivesModule.directive('timelineDetails', timelineDetails);
