'use strict';

var nprogress = require('nprogress');

var servicesModule = require('./_index.js');

/**
 * @ngInject
 */
function ProgressService() {

  return {
    start: function(options) {
      if (options) {
        nprogress.configure(options);
      }

      nprogress.start();
    },

    done: function() {
      nprogress.done();
    },

    remove: function() {
      nprogress.remove();
    },

    set: function(val) {
      nprogress.set(val);
    },

    inc: function() {
      nprogress.inc();
    }
  };

}

servicesModule.service('progressService', ProgressService);
