'use strict';

var filtersModule = require('./_index.js');

var format = function(value) {
  if (value < 10) {
    return '0' + value;
  } else {
    return value.toString();
  }
};

var secondsToTime = function(seconds) {
  var hours = Math.floor(seconds / 60 / 60);
  seconds = seconds - (hours * 60 * 60);

  var minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds - minutes * 60);

  var ret = format(minutes) + ':' + format(seconds);
  if (hours > 0) {
    ret = hours + ':' + ret;
  }

  return ret;
};

filtersModule.filter('secondsToTime', function() { return secondsToTime; });
