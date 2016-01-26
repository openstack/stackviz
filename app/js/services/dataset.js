'use strict';

var servicesModule = require('./_index.js');

/**
 * @ngInject
 */
function DatasetService($q, $http) {

  var service = {};

  service.list = function() {
    return $http({
      cache: true,
      url: 'data/config.json',
      method: 'GET'
    });
  };

  service.get = function(id) {
    return $q(function(resolve, reject) {
      service.list().then(function(response) {
        for (var i in response.data.tempest) {
          var entry = response.data.tempest[i];
          if (entry.id === id) {
            resolve(entry);
            return;
          }
        }

        reject("Dataset not found with ID: " + id);
      }, function(reason) {
        reject(reason);
      });
    });
  };

  service.raw = function(dataset) {
    return $http({
      cache: true,
      url: "data/" + dataset.raw,
      method: 'GET'
    });
  };

  service.details = function(dataset) {
    return $http({
      cache: true,
      url: "data/" + dataset.details,
      method: 'GET'
    });
  };

  service.tree = function(dataset) {
    return $http({
      cache: true,
      url: "data/" + dataset.tree,
      method: 'GET'
    });
  };

  service.dstat = function(dataset) {
    return $http({
      cache: true,
      url: "data/" + dataset.dstat,
      method: 'GET'
    });
  };

  return service;

}

servicesModule.service('datasetService', DatasetService);
