'use strict';

var filtersModule = require('./_index.js');

var contextClass = function(test, type) {
  var clazz;
  if (test.status === 'success') {
    clazz = 'success';
  } else if (test.status === 'skip') {
    clazz = 'info';
  } else if (test.status === 'fail') {
    clazz = 'danger';
  } else {
    clazz = 'default';
  }

  if (type) {
    return type + '-' + clazz;
  } else {
    return clazz;
  }
};

filtersModule.filter('contextClass', function() { return contextClass; });
