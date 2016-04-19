'use strict';

var controllersModule = require('./_index');

/**
 * @ngInject
 */
var TestDetailsCtrl =
/**
 * Responsible for making three calls to the dataset service. First, the
 * dataset corresponding to the given int id is loaded, then the raw and details
 * JSON files are loaded and placed into state variables. Also note that a copy
 * of the details JSON is kept in `originalDetails` so that information is not
 * lost when parsing. Progress of the dataset service calls is recorded and
 * displayed in a progress bar on `test-details.html`.
*/
function($scope, $location, $stateParams, $log, datasetService, progressService) {
  var vm = this;
  vm.datasetId = $stateParams.datasetId;
  var testName = $stateParams.test;
  vm.testName = testName;

  progressService.start({ parent: 'div[role="main"] .panel-body' });

  // load dataset, raw json, and details json
  datasetService.get($stateParams.datasetId)
    .then(function(response) {
      vm.dataset = response;
      vm.stats = response.stats;
      return datasetService.raw(response);
    })
    .then(function(raw) {
      var item = null;
      for (var t in raw.data) {
        if (raw.data[t].name === testName) {
          item = raw.data[t];
        }
      }
      vm.item = item;
      progressService.inc();
      return datasetService.details(vm.dataset);
    })
    .then(function(deets) {
      vm.details = deets;
      vm.originalDetails = angular.copy(deets.data[testName]);
      vm.itemDetails = deets.data[testName];
      progressService.done();
    })
    .catch(function(error) {
      $log.error(error);
      progressService.done();
    });

  vm.parsePythonLogging =
  /**
   * This function changes the `itemDetails.pythonlogging` variable to only
   * show lines with the log levels specified by the four boolean parameters.
   * EX: If the `showINFO` parameter is set to true, `itemDetails.pythonlogging`
   * will display lines that contain the text `INFO`.
   * @param {boolean} showINFO
   * @param {boolean} showDEBUG
   * @param {boolean} showWARNING
   * @param {boolean} showERROR
   */
  function(showINFO, showDEBUG, showWARNING, showERROR) {
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
