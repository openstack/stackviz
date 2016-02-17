'use strict';

var controllersModule = require('./_index');

/**
 * @ngInject
 */
function HomeCtrl($scope, $state, datasetService) {

  // ViewModel
  var vm = this;
  vm.focus = $state.params.artifactName;

  datasetService.groups().then(function(groups) {
    vm.groups = groups;

    if (!vm.focus) {
      vm.focus = groups[0];
    }
  });

  // update the page url as the focus id changes, but don't reload
  $scope.$watch(function() {
    return vm.focus;
  }, function(value, old) {
    if (value !== old) {
      $state.go('home', { artifactName: value }, { notify: false });
    }
  });

}

controllersModule.controller('HomeController', HomeCtrl);
