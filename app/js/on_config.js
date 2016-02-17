'use strict';

/**
 * @ngInject
 */
function OnConfig($stateProvider, $locationProvider, $urlRouterProvider) {

  $stateProvider.state('home', {
    url: '/{artifactName}',
    params: { artifactName: null },
    controller: 'HomeController as home',
    templateUrl: 'home.html',
    title: 'Home'
  });

  $stateProvider.state('timeline', {
    url: '/{artifactName}/timeline?test',
    controller: 'TimelineController as timeline',
    templateUrl: 'timeline.html',
    reloadOnSearch: false,
    title: 'Timeline'
  });

  $stateProvider.state('testDetails', {
    url: '/{artifactName}/test-details/{test}',
    controller: 'TestDetailsController',
    controllerAs: 'testDetails',
    templateUrl: 'test-details.html',
    title: 'Test Details'
  });

  $urlRouterProvider.otherwise('/');

}

OnConfig.$inject = ['$stateProvider','$locationProvider','$urlRouterProvider'];
module.exports = OnConfig;
