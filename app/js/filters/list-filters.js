'use strict';

var filtersModule = require('./_index.js');

var split = function(input, delim) {
  delim = delim || ',';

  return input.split(delim);
};

var join = function(input, delim) {
  delim = delim || ', ';

  return input.join(delim);
};

var pick = function(input, index) {
  return input[index];
};

var pickRight = function(input, index) {
  return input[input.length - index];
};

var slice = function(input, begin, end) {
  return input.slice(begin, end);
};

var first = function(input, length) {
  length = length || 1;

  return input.slice(0, input.length - length);
};

var last = function(input, length) {
  length = length || 1;

  return input.slice(input.length - length, input.length);
};

filtersModule.filter('split', function() { return split; });
filtersModule.filter('join', function() { return join; });
filtersModule.filter('pick', function() { return pick; });
filtersModule.filter('pickRight', function() { return pickRight; });
filtersModule.filter('slice', function() { return slice; });
filtersModule.filter('first', function() { return first; });
filtersModule.filter('last', function() { return last; });
