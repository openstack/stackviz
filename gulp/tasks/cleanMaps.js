'use strict';

var config = require('../config');
var gulp   = require('gulp');
var del    = require('del');
var path   = require('path');

gulp.task('cleanmaps', function(cb) {

  // It seems to be impossible to disable sourcemaps normally. Instead, delete
  // them at the end of 'prod'.
  return del([path.join(config.scripts.dest, 'main.js.map')]);

});
