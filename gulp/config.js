'use strict';

module.exports = {

  'browserPort'  : 3000,
  'UIPort'       : 3001,
  'serverPort'   : 3002,

  'styles': {
    'src' : 'app/styles/**/*.scss',
    'dest': 'gulp-build/css'
  },

  'scripts': {
    'src' : 'app/js/**/*.js',
    'dest': 'gulp-build/js'
  },

  'fonts': {
    'src' : ['app/fonts/**/*'],
    'dest': 'gulp-build/fonts'
  },

  'views': {
    'watch': [
      'app/index.html',
      'app/views/**/*.html'
    ],
    'src': 'app/views/**/*.html',
    'dest': 'app/js'
  },

  'gzip': {
    'src': 'gulp-build/**/*.{html,xml,json,css,js,js.map}',
    'rewrite': '**/*.html',
    'dest': 'gulp-build/',
    'options': {}
  },

  'dist': {
    'root'  : 'gulp-build'
  },

  'browserify': {
    'entries'   : ['./app/js/main.js'],
    'bundleName': 'main.js',
    'sourcemap' : true
  },

  'test': {
    'karma': 'test/karma.conf.js',
    'protractor': 'test/protractor.conf.js'
  },

  'data': {
    'src' : ['app/data/**/*'],
    'dest': 'gulp-build/data'
  }

};
