'use strict';

var directivesModule = require('./_index.js');

/**
 * @ngInject
 */
function artifactSummary($compile, datasetService, summaryService) {
  var link = function(scope, el, attrs, ctrl) {
    scope.$watch('artifactName', function(artifactName) {
      el.empty();

      datasetService.artifacts(artifactName).then(function(artifacts) {
        artifacts.forEach(function(artifact) {
          summaryService.directivesForType(artifact.artifact_type).forEach(function(d) {
            var name = d.directiveName;
            var tag = '<' + name + ' artifact-name="\'' + artifactName + '\'">' +
                '</' + name + '>';

            var e = $compile(tag)(scope);
            el.append(e);
          });
        });
      });
    });
  };

  return {
    restrict: 'EA',
    scope: {
      'artifactName': '='
    },
    link: link
  };
}

directivesModule.directive('artifactSummary', artifactSummary);
