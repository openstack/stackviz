'use strict';

var controllersModule = require('./_index');

/**
 * @ngInject
 */
function TimelineCtrl($scope, $location, $stateParams, datasetService) {

  // ViewModel
  var vm = this;

  datasetService.get($stateParams.datasetId).then(function(dataset) {
    vm.dataset = dataset;
  }, function(reason) {
    vm.error = "Unable to load dataset: " + reason;
  });

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

controllersModule.controller('TimelineCtrl', TimelineCtrl);
