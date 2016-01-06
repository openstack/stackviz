'use strict';

var controllersModule = require('./_index');

/**
 * @ngInject
 */
function TestDetailsCtrl($scope, $location, $stateParams, datasetService) {
   // ViewModel
  var vm = this;
  vm.datasetId = $stateParams.datasetId;
  var testName = $stateParams.test;
  vm.testName = testName;

  // load dataset, raw json, and details json
  datasetService.get($stateParams.datasetId).then(function(response) {
    vm.dataset = response;
    vm.stats = response.stats;
    datasetService.raw(response).then(function(raw) {
      var item = null;
      for (var t in raw.data) {
        if (raw.data[t].name === testName) {
          item = raw.data[t];
        }
      }
      vm.item = item;
    }).catch(function(ex) {
      $log.error(ex);
    });
    datasetService.details(response).then(function(deets) {
      vm.details = deets;
      vm.itemDetails = deets.data[testName];
    }).catch(function(ex) {
      $log.error(ex);
    });
  }).catch(function(ex) {
    $log.error(ex);
  });

}
controllersModule.controller('TestDetailsCtrl', TestDetailsCtrl);
