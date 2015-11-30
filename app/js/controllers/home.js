'use strict';

var controllersModule = require('./_index');

/**
 * @ngInject
 */
function HomeCtrl($scope, $state, datasetService) {

  // ViewModel
  var vm = this;
  vm.focus = $state.params.datasetId;

  datasetService.list().then(function(response) {
    vm.tempest = response.data.tempest;
  });

  // update the page url as the focus id changes, but don't reload
  $scope.$watch(function() {
    return vm.focus;
  }, function(value, old) {
    if (value !== old) {
      $state.go('home', { datasetId: value }, { notify: false });
    }
  });

}

controllersModule.controller('HomeCtrl', HomeCtrl);
