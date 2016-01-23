'use strict';

var controllersModule = require('./_index');

/**
 * @ngInject
 */
function TestDetailsCtrl($scope, $location, $stateParams, datasetService, progressService) {
   // ViewModel
  var vm = this;
  $scope.datasetId = $stateParams.datasetId;
  var testName = $stateParams.test;
  $scope.testName = testName;

  progressService.start({ parent: 'div[role="main"] .panel-body' });

  // load dataset, raw json, and details json
  datasetService.get($stateParams.datasetId).then(function(response) {
    $scope.dataset = response;
    $scope.stats = response.stats;
    datasetService.raw(response).then(function(raw) {
      var item = null;
      for (var t in raw.data) {
        if (raw.data[t].name === testName) {
          item = raw.data[t];
        }
      }
      $scope.item = item;

      progressService.inc();
    }).catch(function(ex) {
      $log.error(ex);
      progressService.done();
    });
    datasetService.details(response).then(function(deets) {
      $scope.details = deets;
      $scope.originalDetails = angular.copy(deets.data[testName]);
      $scope.itemDetails = deets.data[testName];

      progressService.done();
    }).catch(function(ex) {
      $log.error(ex);
      progressService.done();
    });
  }).catch(function(ex) {
    $log.error(ex);
    progressService.done();
  });

  $scope.parsePythonLogging = function(showINFO, showDEBUG, showWARNING, showERROR) {
    if ($scope.originalDetails && $scope.originalDetails.pythonlogging) {
      var log = $scope.originalDetails.pythonlogging;
      var ret = [];
      var lines = log.split('\n');
      for (var i in lines) {
        var line = lines[i];
        if (showINFO && line.includes("INFO")) {
          ret.push(line);
        }
        else if (showDEBUG && line.includes("DEBUG")) {
          ret.push(line);
        }
        else if (showWARNING && line.includes("WARNING")) {
          ret.push(line);
        }
        else if (showERROR && line.includes("ERROR")) {
          ret.push(line);
        }
      }
      $scope.itemDetails.pythonlogging = ret.join('\n');
    }
  };

}
controllersModule.controller('TestDetailsCtrl', TestDetailsCtrl);
