'use strict';

var filtersModule = require('./_index.js');

var statusClass = function(status, type) {
  var clazz;
  if (!status) {
    clazz = 'default';
  } else {
    status = status.toLowerCase();

    if (status === 'success') {
      clazz = 'success';
    } else if (status === 'skip') {
      clazz = 'info';
    } else if (status === 'fail' || status === 'failure') {
      clazz = 'danger';
    } else {
      clazz = 'default';
    }
  }

  if (type) {
    return type + '-' + clazz;
  } else {
    return clazz;
  }
};

var contextClass = function(test, type) {
  return statusClass(test.status, type);
};

filtersModule.filter('contextClass', function() { return contextClass; });
filtersModule.filter('statusClass', function() { return statusClass; });
