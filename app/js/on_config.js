'use strict';

/**
 * @ngInject
 */
function OnConfig($stateProvider, $locationProvider, $urlRouterProvider) {

  $locationProvider.html5Mode(true);

  $stateProvider.state('home', {
    url: '/',
    controller: 'HomeCtrl as home',
    templateUrl: 'home.html',
    title: 'Home'
  });

  $stateProvider.state('timeline', {
    url: '/timeline/{datasetId:int}',
    controller: 'TimelineCtrl as timeline',
    templateUrl: 'timeline.html',
    title: 'Timeline'
  });

  $urlRouterProvider.otherwise('/');

}

module.exports = OnConfig;
