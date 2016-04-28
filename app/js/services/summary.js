'use strict';

var servicesModule = require('./_index.js');

/**
 * @ngInject
 */
function SummaryService() {
  var mappings = [];

  var service = {
    directivesForType: function(artifactType) {
      return mappings.filter(function(mapping) {
        return mapping.artifactType === artifactType;
      });
    },

    mapType: function(artifactType, directiveName, priority) {
      if (typeof priority === 'undefined') {
        priority = 0;
      }

      mappings.push({
        artifactType: artifactType,
        directiveName: directiveName,
        priority: priority
      });

      mappings.sort(function(a, b) {
        return b.priority - a.priority;
      });
    }
  };

  // default mappings
  service.mapType('subunit-stats', 'subunit-summary', 5);
  service.mapType('subunit-stats', 'subunit-failures', 4);
  service.mapType('console', 'console-summary', 5);

  return service;
}

servicesModule.service('summaryService', SummaryService);
