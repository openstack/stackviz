'use strict';

var servicesModule = require('./_index.js');

/**
 * @ngInject
 */
function DatasetService($q, $http, $window) {

  var service = {};

  var config = null;
  var datasets = null;
  var artifacts = new Map();
  var deployer = false;

  /**
   * Return a promise to fetch the dataset associated with the current URL path.
   * This is only valid when in deployer mode.
   * @return {Promise} an $http promise for the current deployer dataset
   */
  var fetchDeployerDataset = function() {
    // get uuid from first segment of url, but remove any defined config root
    var path = $window.location.pathname;
    if (config.root && path.startsWith(config.root)) {
      path = path.replace(config.root, '');
    }

    // remove leading '/' (if any)
    if (path.startsWith('/')) {
      path = path.substr(1, path.length - 1);
    }

    // trim to first segment if necessary
    if (path.includes('/')) {
      path = path.substring(0, path.indexOf('/'));
    }

    return $http({
      cache: true,
      url: config.apiRoot + '/task',
      method: 'POST',
      data: { q: path }
    });
  };

  /**
   * Adds the given list of artifacts to the global artifact map, based on their
   * `artifact_name` fields.
   * @param  {object[]} artifacts a list of artifacts
   */
  var initArtifacts = function(list) {
    list.forEach(function(artifact) {
      if (artifacts.has(artifact.artifact_name)) {
        artifacts.get(artifact.artifact_name).push(artifact);
      } else {
        artifacts.set(artifact.artifact_name, [artifact]);
      }
    });
  };

  service.config = function() {
    return $q(function(resolve, reject) {
      if (config) {
        resolve({ config: config, datasets: datasets, artifacts: artifacts });
        return;
      }

      $http({
        cache: true,
        url: 'data/config.json',
        method: 'GET'
      }).then(function(response) {
        config = response.data;

        if (config.deployer === true) {
          deployer = true;

          fetchDeployerDataset().then(function(apiResponse) {
            datasets = [ apiResponse.data ];
            initArtifacts(apiResponse.data.artifacts);
            resolve({
              config: config,
              datasets: datasets,
              artifacts: artifacts
            });
          }, function(reason) {
            reject(reason);
          });
        } else {
          datasets = config.datasets;

          // merge all datasets into a 1-level grouping for now
          config.datasets.forEach(function(dataset) {
            initArtifacts(dataset.artifacts);
          });

          resolve({
            config: config,
            datasets: datasets,
            artifacts: artifacts
          });
        }
      }, function(reason) {
        reject(reason);
      });
    });
  };

  /**
   * Lists all datasets.
   * @return {Promise} a Promise for the global list of datasets
   */
  service.list = function() {
    return $q(function(resolve, reject) {
      /* eslint-disable angular/di */
      service.config().then(function(config) {
        resolve(config.datasets);
      }, reject);
      /* eslint-enable angular/di */
    });
  };

  /**
   * Lists all artifact groups that contain at least one artifact. If `primary`
   * is true (default), only groups with at least one primary artifact are
   * returned.
   * @return {Promise} a Promise for the global list of datasets
   */
  service.groups = function(primary) {
    if (typeof primary === 'undefined') {
      primary = true;
    }

    return $q(function(resolve, reject) {
      /* eslint-disable angular/di */
      service.config().then(function(config) {
        var ret = [];
        config.artifacts.forEach(function(entries, name) {
          if (primary) {
            entries = entries.filter(function(artifact) {
              return artifact.primary;
            });
          }

          if (entries.length > 0) {
            ret.push(name);
          }
        });

        resolve(ret);
      }, reject);
      /* eslint-enable angular/di */
    });
  };

  /**
   * Gets the dataset with the given ID. Note that for deployer instances, there
   * will only ever be a single dataset (id #0). In most cases, dataset #0
   * should be treated as the 'primary' dataset (and should almost always be the
   * only one configured).
   * @param  {number} id the index of the dataset to get
   * @return {Promise}   a Promise to retreive the specified dataset
   */
  service.get = function(id) {
    return $q(function(resolve, reject) {
      /* eslint-disable angular/di */
      service.config().then(function(config) {
        var dataset = config.datasets[id];
        if (dataset) {
          resolve(dataset);
        } else {
          reject("Dataset not found with ID: " + id);
        }
      }, function(reason) {
        reject(reason);
      });
      /* eslint-enable angular/di */
    });
  };

  /**
   * Fetch all artifacts with the given `artifact_name` field. This should be
   * the primary method for differentiating between artifacts. If no artifact
   * name is given, this returns a flat list of all artifacts (via a Promise).
   * @param  {string} [name] an `artifact_name` field value
   * @return {Promise}       a promise for a list of matching artifacts
   */
  service.artifacts = function(name) {
    return $q(function(resolve, reject) {
      /* eslint-disable angular/di */
      service.config().then(function(config) {
        if (typeof name === 'undefined') {
          var ret = [];
          config.datasets.forEach(function(dataset) {
            ret.push.apply(ret, dataset.artifacts);
          });
          resolve(ret);
        } else {
          var group = config.artifacts.get(name);
          if (group && group.length > 0) {
            resolve(group);
          } else {
            reject('No artifacts found with name: ' + name);
          }
        }
      }, reject);
      /* eslint-enable angular/di */
    });
  };

  var _loadArtifact = function(artifact, resolve, reject, message) {
    if (artifact) {
      var url = null;
      if (deployer) {
        url = config.apiRoot + '/blob/' + artifact.id;
      } else {
        url = 'data/' + artifact.path;
      }

      resolve($http({
        cache: true,
        url: url,
        method: 'GET'
      }));
    } else {
      reject('No artifact found matching ' + message);
    }
  };

  /**
   * Fetch the artifact with the given `artifact_name` and `artifact_type`
   * fields. If only one parameter is provided, only `artifact_type` is
   * considered.
   * @param  {string} [name] an `artifact_name` field value
   * @param  {string} type   an `artifact_type` field value (e.g. 'subunit')
   * @return {Promise}       a Promise for the actual data associated with the
   *                         artifact
   */
  service.artifact = function(name, type) {
    if (arguments.length === 1) {
      type = arguments[0];

      return $q(function(resolve, reject) {
        service.artifacts().then(function(all) {
          _loadArtifact(all.find(function(a) {
            return a.artifact_type === type;
          }), resolve, reject, 'type=' + type);
        });
      });
    } else {
      return $q(function(resolve, reject) {
        service.artifacts(name).then(function(group) {
          _loadArtifact(group.find(function(a) {
            return a.artifact_type === type;
          }), resolve, reject, 'name=' + name + ', type=' + type);
        }, reject);
      });
    }
  };

  return service;

}

servicesModule.service('datasetService', DatasetService);
