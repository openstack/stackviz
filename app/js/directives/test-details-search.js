'use strict';

var directivesModule = require('./_index.js');

/**
 * @ngInject
 */
function testDetailsSearch() {

  /**
   * @ngInject
   */
  var controller =
  /**
   * Responsible for calling the `parsePythonLogging` filter function in
   * `TestDetailsController` when the log level buttons change state. The
   * `filter` function is passed from `test-details` to `test-details-search`
   * when the directive is initially instantiated.
   */
  function($scope, $element) {
    var self = this;
    this.open = false;
    this.showINFO = true;
    this.showDEBUG = true;
    this.showWARNING = true;
    this.showERROR = true;

    // Wrapper for parent controller's filter function.
    var update = function() {
      $scope.filter(self.showINFO, self.showDEBUG, self.showWARNING, self.showERROR);
    };

    // Watchers to signal update function upon button state change.
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
