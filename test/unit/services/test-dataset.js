/*global angular */
'use strict';

describe('Unit: DatasetService', function() {

  var service, httpBackend;

  var mockConfig = {
    "deployer": false,
    "datasets": [{
      "status": null, "ci_username": null, "pipeline": null,
      "change_project": null, "name": null, "url": null,
      "change_id": null, "change_subject": null, "revision": null,
      "artifacts": [
        {
          "artifact_type": "dstat", "path": "dstat.csv", "primary": false,
          "content_type": "text/csv", "artifact_name": "dstat-csv.txt"
        }, {
          "artifact_type": "subunit", "primary": true,
          "path": "testrepository.subunit-0-raw.json",
          "content_type": "application/json",
          "artifact_name": "testrepository.subunit"
        }, {
          "artifact_type": "subunit-details", "primary": false,
          "path": "testrepository.subunit-0-details.json",
          "content_type": "application/json",
          "artifact_name": "testrepository.subunit"
        }, {
          "artifact_type": "subunit-stats", "primary": false,
          "path": "testrepository.subunit-0-stats.json",
          "content_type": "application/json",
          "artifact_name": "testrepository.subunit"
        }
      ]
    }]
  };

  beforeEach(function() {
    // instantiate the app module
    angular.mock.module('app');

    // mock the service
    angular.mock.inject(function(datasetService, $httpBackend) {
      service = datasetService;
      httpBackend = $httpBackend;

      httpBackend.whenGET("data/config.json").respond(mockConfig);
    });
  });

  it('should exist', function() {
    expect(service).toBeDefined();
  });

  it('should return the loaded configuration', function() {
    service.config().then(function(config) {
      expect(config.config).toEqual(mockConfig);
    });
    httpBackend.flush();
  });

  it('should only have valid primary artifacts', function() {
    service.groups(true).then(function(groups) {
      expect(groups.length).toEqual(1);
      expect(groups).toContain('testrepository.subunit');
    }, function() {
      fail('callback should return');
    });

    httpBackend.flush();
  });

  it('should find all artifacts matching a particular name', function() {
    service.artifacts('testrepository.subunit').then(function(artifacts) {
      expect(artifacts.length).toEqual(3);
    }, function() {
      fail('callback should return');
    });

    httpBackend.flush();
  });

  it('should load an artifact', function() {
    httpBackend.whenGET('data/testrepository.subunit-0-raw.json').respond({
      mock: true
    });

    service.artifact('testrepository.subunit', 'subunit').then(function(resp) {
      expect(resp.data).toEqual({ mock: true });
    }, function(ex) {
      fail('promise should return successfully: ' + ex);
    });

    httpBackend.flush();
  });
});
