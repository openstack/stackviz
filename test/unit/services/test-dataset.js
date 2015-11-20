/*global angular */

'use strict';

describe('Unit: DatasetService', function() {

  var service, httpBackend;
  var exampleConfig = {"tempest": [
    {"raw": "tempest_file_freshlog_0_raw.json",
    "details": "tempest_file_freshlog_0_details.json",
    "tree": "tempest_file_freshlog_0_tree.json",
    "id": 0,
    "name": "Subunit File: freshlog"}
  ]};

  beforeEach(function() {
    // instantiate the app module
    angular.mock.module('app');

    // mock the service
    angular.mock.inject(function(datasetService, $httpBackend) {
      service = datasetService;
      httpBackend = $httpBackend;
    });
  });

  it('should exist', function() {
    expect(service).toBeDefined();
  });

  it('should return config.json', function() {
    httpBackend.whenGET("data/config.json").respond(exampleConfig);
    service.list().then(function(config) {
      expect(config.data).toEqual(exampleConfig);
    });
    httpBackend.flush();
  });

  it('should GET the raw file from a dataset', function() {
    httpBackend.whenGET(exampleConfig.raw).respond(exampleConfig.raw);
    service.raw(exampleConfig).then(function(raw) {
      expect(raw).toEqual(exampleConfig.raw);
    });
  });

  it('should GET the details file from a dataset', function() {
    httpBackend.whenGET(exampleConfig.details).respond(exampleConfig.details);
    service.details(exampleConfig).then(function(details) {
      expect(details).toEqual(exampleConfig.details);
    });
  });

  it('should GET the tree file from a dataset', function() {
    httpBackend.whenGET(exampleConfig.tree).respond(exampleConfig.tree);
    service.tree(exampleConfig).then(function(tree) {
      expect(tree).toEqual(exampleConfig.tree);
    });
  });

  it('should GET the dstat file from a dataset', function() {
    httpBackend.whenGET(exampleConfig.dstat).respond(exampleConfig.dstat);
    service.dstat(exampleConfig).then(function(dstat) {
      expect(dstat).toEqual(exampleConfig.dstat);
    });
  });

});
