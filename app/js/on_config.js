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
    url: '/{datasetId:int}/timeline',
    controller: 'TimelineCtrl as timeline',
    templateUrl: 'timeline.html',
    title: 'Timeline'
  });

  $urlRouterProvider.otherwise('/');

}

module.exports = OnConfig;
