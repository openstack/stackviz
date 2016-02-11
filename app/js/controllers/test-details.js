'use strict';

var controllersModule = require('./_index');

/**
 * @ngInject
 */
var TestDetailsCtrl = function($scope, $location, $stateParams, datasetService, progressService) {
  var vm = this;
  vm.datasetId = $stateParams.datasetId;
  var testName = $stateParams.test;
  vm.testName = testName;

  progressService.start({ parent: 'div[role="main"] .panel-body' });

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

      progressService.inc();
    }).catch(function(ex) {
      $log.error(ex);
      progressService.done();
    });
    datasetService.details(response).then(function(deets) {
      vm.details = deets;
      vm.originalDetails = angular.copy(deets.data[testName]);
      vm.itemDetails = deets.data[testName];

      progressService.done();
    }).catch(function(ex) {
      $log.error(ex);
      progressService.done();
    });
  }).catch(function(ex) {
    $log.error(ex);
    progressService.done();
  });

  vm.parsePythonLogging = function(showINFO, showDEBUG, showWARNING, showERROR) {
    if (vm.originalDetails && vm.originalDetails.pythonlogging) {
      var log = vm.originalDetails.pythonlogging;
      var ret = [];
      var lines = log.split('\n');
      for (var i in lines) {
        var line = lines[i];
        if (showINFO && line.includes("INFO")) {
          ret.push(line);
        }
        if (showDEBUG && line.includes("DEBUG")) {
          ret.push(line);
        }
        if (showWARNING && line.includes("WARNING")) {
          ret.push(line);
        }
        if (showERROR && line.includes("ERROR")) {
          ret.push(line);
        }
      }
      vm.itemDetails.pythonlogging = ret.join('\n');
    }
  };

};
controllersModule.controller('TestDetailsController', TestDetailsCtrl);
