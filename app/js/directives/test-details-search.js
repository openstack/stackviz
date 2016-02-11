'use strict';

var directivesModule = require('./_index.js');

/**
 * @ngInject
 */
function testDetailsSearch() {

  /**
   * @ngInject
   */
  var controller = function($scope, $element) {
    var self = this;
    this.open = false;
    this.showINFO = true;
    this.showDEBUG = true;
    this.showWARNING = true;
    this.showERROR = true;

    var update = function() {
      $scope.filter(self.showINFO, self.showDEBUG, self.showWARNING, self.showERROR);
    };

    $scope.$watch(function() { return self.query; }, update);
    $scope.$watch(function() { return self.showINFO; }, update);
    $scope.$watch(function() { return self.showDEBUG; }, update);
    $scope.$watch(function() { return self.showWARNING; }, update);
    $scope.$watch(function() { return self.showERROR; }, update);
  };

  return {
    restrict: 'EA',
    require: ['^testDetailsSearch','^testDetails'],
    scope: {
      'filter': '='
    },
    controller: controller,
    controllerAs: 'search',
    templateUrl: 'directives/test-details-search.html',
    transclude: true
  };
}

directivesModule.directive('testDetailsSearch', testDetailsSearch);
