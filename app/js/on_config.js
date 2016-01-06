'use strict';

/**
 * @ngInject
 */
function OnConfig($stateProvider, $locationProvider, $urlRouterProvider) {

  $stateProvider.state('home', {
    url: '/{datasetId:int}',
    params: { datasetId: 0 },
    controller: 'HomeCtrl as home',
    templateUrl: 'home.html',
    title: 'Home'
  });

  $stateProvider.state('timeline', {
    url: '/{datasetId:int}/timeline?test',
    controller: 'TimelineCtrl as timeline',
    templateUrl: 'timeline.html',
    reloadOnSearch: false,
    title: 'Timeline'
  });

  $stateProvider.state('testDetails', {
    url: '/{datasetId:int}/test-details/{test}',
    controller: 'TestDetailsCtrl as testDetails',
    templateUrl: 'test-details.html',
    title: 'Test Details'
  });

  $urlRouterProvider.otherwise('/');

}

module.exports = OnConfig;
