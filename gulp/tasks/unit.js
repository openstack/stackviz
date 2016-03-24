'use strict';

var path = require('path');

var gulp   = require('gulp');
var karma  = require('karma');
var config = require('../config');

gulp.task('unit', ['views'], function(done) {
  new karma.Server({
    configFile: path.join(process.cwd(), config.test.karma)
  }, done).start();
});
