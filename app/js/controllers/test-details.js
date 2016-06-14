'use strict';

var controllersModule = require('./_index');

/**
 * Responsible for making three calls to the dataset service. First, the
 * dataset corresponding to the given int id is loaded, then the raw and details
 * JSON files are loaded and placed into state variables. Also note that a copy
 * of the details JSON is kept in `originalDetails` so that information is not
 * lost when parsing. Progress of the dataset service calls is recorded and
 * displayed in a progress bar on `test-details.html`.
 * @ngInject
 */
function TestDetailsCtrl(
    $scope, $location, $stateParams, $log, $q,
    datasetService, progressService, AppSettings) {
  var vm = this;
  vm.artifactName = $stateParams.artifactName;
  vm.testName = $stateParams.test;
  vm.healthRoot = AppSettings.healthRoot;

  progressService.start({ parent: 'div[role="main"] .panel-body' });

  // load dataset, raw json, and details json
  var statsArtifact = datasetService.artifact(vm.artifactName, 'subunit-stats');
  var subunitArtifact = datasetService.artifact(vm.artifactName, 'subunit');
  var detailsArtifact = datasetService.artifact(vm.artifactName, 'subunit-details');

  var statsPromise = statsArtifact.then(function(response) {
    vm.stats = response.data;
  });

  var subunitPromise = subunitArtifact.then(function(response) {
    var item = null;
    for (var t in response.data) {
      if (response.data[t].name === vm.testName) {
        item = response.data[t];
      }
    }
    vm.item = item;
    progressService.inc();
  });

  var detailsPromise = detailsArtifact.then(function(details) {
    vm.details = details;
    vm.originalDetails = angular.copy(details.data[vm.testName]);
    vm.itemDetails = details.data[vm.testName];
  }).catch(function(ex) {
    // ignore errors, details won't exist for deployer
  });

  $q.all([statsPromise, subunitPromise, detailsPromise]).catch(function(ex) {
    $log.error(ex);
  }).finally(function() {
    progressService.done();
  });

  /**
   * This function changes the `itemDetails.pythonlogging` variable to only
   * show lines with the log levels specified by the four boolean parameters.
   * EX: If the `info` parameter is set to true, `itemDetails.pythonlogging`
   * will display lines that contain the text `INFO`.
   * @param {boolean} info
   * @param {boolean} debug
   * @param {boolean} warning
   * @param {boolean} error
   */
  vm.parsePythonLogging = function(info, debug, warning, error) {
    if (vm.originalDetails && vm.originalDetails.pythonlogging) {
      var log = vm.originalDetails.pythonlogging;
      var ret = [];
      var lines = log.split('\n');
      for (var i in lines) {
        var line = lines[i];
        if (info && line.includes("INFO")) {
          ret.push(line);
        }
        if (debug && line.includes("DEBUG")) {
          ret.push(line);
        }
        if (warning && line.includes("WARNING")) {
          ret.push(line);
        }
        if (error && line.includes("ERROR")) {
          ret.push(line);
        }
      }
      vm.itemDetails.pythonlogging = ret.join('\n');
    }
  };
}

controllersModule.controller('TestDetailsController', TestDetailsCtrl);
