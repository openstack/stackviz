'use strict';

var angular = require('angular');

// angular modules
require('angular-ui-router');
require('angular-ui-bootstrap');
require('angular-fontawesome');
require('./templates');
require('./controllers/_index');
require('./services/_index');
require('./directives/_index');
require('./filters/_index');

var bootstrap = function() {

  var requires = [
    'ui.router',
    'ui.bootstrap',
    'templates',
    'app.controllers',
    'app.services',
    'app.directives',
    'app.filters',
    'picardy.fontawesome'
  ];

  // mount on window for testing
  window.app = angular.module('app', requires);

  angular.module('app').constant('AppSettings', require('./constants'));

  angular.module('app').config(require('./on_config'));

  angular.module('app').run(require('./on_run'));

  angular.bootstrap(document, ['app']);

  window.bootstrap = null;
};

// create and bootstrap application
angular.element(document).ready(bootstrap);
window.bootstrap = bootstrap;
