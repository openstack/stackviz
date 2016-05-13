'use strict';

var CodeMirror = require('codemirror');
require('codemirror/addon/mode/simple');
require('codemirror/addon/fold/foldcode');
require('codemirror/addon/fold/foldgutter');

var directivesModule = require('./_index.js');

CodeMirror.defineSimpleMode('console', {
  start: [
    {
      token: 'comment',
      regex: /[\d\-]+ [\d\:\.]+ \|/,
      sol: true
    }, {
      token: 'keyword',
      regex: /\[[a-z\-]+\] \$ .*/
    }
  ]
});

/**
 * @ngInject
 */
function codemirrorConsole($compile, $window, datasetService, summaryService) {
  var instance = null;
  var element = null;
  var headers = new Map();

  var rangeFinder = function(cm, pos) {
    if (!headers.has(pos.line)) {
      return null;
    }

    var foundSelf = false;
    var foldEnd = null;
    headers.forEach(function(name, lineNo) {
      if (!foundSelf && lineNo === pos.line) {
        foundSelf = true;
        return;
      }

      if (foundSelf && foldEnd === null) {
        foldEnd = lineNo - 1;
      }
    });

    if (foldEnd === null) {
      foldEnd = cm.lastLine();
    }

    return {
      from: CodeMirror.Pos(pos.line, cm.getLine(pos.line).length),
      to: CodeMirror.Pos(foldEnd, cm.getLine(foldEnd).length)
    };
  };

  var link = function(scope, el, attrs, ctrl) {
    instance = CodeMirror(el[0], {
      lineNumbers: true,
      readOnly: true,
      value: 'test test test',
      mode: 'console',
      theme: 'neat',
      foldGutter: {
        rangeFinder: rangeFinder
      },
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
    });

    element = el.find('div');

    var updateHeight = function() {
      var rect = element[0].getBoundingClientRect();
      element[0].style.height = ($window.innerHeight - rect.top) + 'px';
    };

    scope.$on('windowResize', updateHeight);
    updateHeight();
  };

  /**
   * @ngInject
   */
  var controller = function($scope) {
    $scope.$watch('data', function(data) {
      if (!data) {
        return;
      }

      var lines = [];
      var currentLine = 0;
      headers.clear();
      data.scripts.forEach(function(script) {
        headers.set(currentLine, script.name);

        script.lines.forEach(function(line) {
          lines.push(line.date + ' | ' + line.line);
          currentLine++;
        });
      });

      instance.setValue(lines.join('\n'));

      var doc = instance.getDoc();
      headers.forEach(function(text, lineNumber) {
        var element = angular.element('<div><span>' + text + '</span></div>');
        element.addClass('console-script-header');

        doc.addLineWidget(lineNumber, element[0], {
          above: true,
          noHScroll: true
        });
      });
    });
  };

  return {
    restrict: 'EA',
    scope: {
      'data': '=',
      'show': '='
    },
    link: link,
    controller: controller
  };
}

directivesModule.directive('codemirrorConsole', codemirrorConsole);
