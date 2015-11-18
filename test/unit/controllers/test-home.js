/*global angular */

'use strict';

describe('Unit: HomeCtrl', function() {

  var ctrl;

  beforeEach(function() {
    // instantiate the app module
    angular.mock.module('app');

    angular.mock.inject(function($controller) {
      ctrl = $controller('HomeCtrl');
    });
  });

  it('should exist', function() {
    expect(ctrl).toBeDefined();
  });

});
