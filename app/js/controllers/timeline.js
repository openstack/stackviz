'use strict';

var controllersModule = require('./_index');

/**
 * @ngInject
 */
function TimelineCtrl($scope, $location, $stateParams, datasetService) {

  // ViewModel
  var vm = this;
  vm.artifactName = $stateParams.artifactName;

  vm.hoveredItem = null;
  vm.selectedItem = null;

  vm.preselect = $location.search().test;

  $scope.$watch(function() {
    return vm.selectedItem;
  }, function(value) {
    if (value) {
      $location.search({ test: value.name });
      vm.preselect = null;
    } else if (vm.preselect === null) {
      $location.search({ test: null });
    }
  });

}

controllersModule.controller('TimelineController', TimelineCtrl);
