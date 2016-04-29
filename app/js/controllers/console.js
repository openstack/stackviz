'use strict';

var controllersModule = require('./_index');

var codemirror = require('codemirror');

/**
 * @ngInject
 */
function ConsoleController($scope, $location, $stateParams, datasetService) {
  var vm = this;
  vm.artifactName = $stateParams.artifactName;
  vm.show = $location.search().show;

  datasetService.artifact(vm.artifactName, 'console').then(function(response) {
    vm.data = response.data;
  });
}

controllersModule.controller('ConsoleController', ConsoleController);
