'use strict';

/**
 * @ngInject
 */
function OnConfig($stateProvider, $locationProvider, $urlRouterProvider) {

  $stateProvider.state('home', {
    url: '/{datasetId:int}',
    params: { datasetId: 0 },
    controller: 'HomeController as home',
    templateUrl: 'home.html',
    title: 'Home'
  });

  $stateProvider.state('timeline', {
    url: '/{datasetId:int}/timeline?test',
    controller: 'TimelineController as timeline',
    templateUrl: 'timeline.html',
    reloadOnSearch: false,
    title: 'Timeline'
  });

  $stateProvider.state('testDetails', {
    url: '/{datasetId:int}/test-details/{test}',
    controller: 'TestDetailsController',
    controllerAs: 'testDetails',
    templateUrl: 'test-details.html',
    title: 'Test Details'
  });

  $urlRouterProvider.otherwise('/');

}

OnConfig.$inject = ['$stateProvider','$locationProvider','$urlRouterProvider'];
module.exports = OnConfig;
