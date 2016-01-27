'use strict';

var directivesModule = require('./_index.js');

var arrayUtil = require('../util/array-util');
var parseDstat = require('../util/dstat-parse');
var d3 = require('d3');

var getDstatLanes = function(data, mins, maxes) {
  if (!data) {
    return [];
  }

  var row = data[0];
  var lanes = [];

  if ('total_cpu_usage_usr' in row && 'total_cpu_usage_sys' in row) {
    lanes.push([{
      scale: d3.scale.linear().domain([0, 100]),
      value: function(d) {
        return d.total_cpu_usage_wai;
      },
      color: "rgba(224, 188, 188, 1)",
      text: "CPU wait"
    }, {
      scale: d3.scale.linear().domain([0, 100]),
      value: function(d) {
        return d.total_cpu_usage_usr + d.total_cpu_usage_sys;
      },
      color: "rgba(102, 140, 178, 0.75)",
      text: "CPU (user+sys)"
    }]);
  }

  if ('memory_usage_used' in row) {
    lanes.push([{
      scale: d3.scale.linear().domain([0, maxes.memory_usage_used]),
      value: function(d) { return d.memory_usage_used; },
      color: "rgba(102, 140, 178, 0.75)",
      text: "Memory"
    }]);
  }

  if ('net_total_recv' in row && 'net_total_send' in row) {
    lanes.push([{
      scale: d3.scale.linear().domain([0, maxes.net_total_recv]),
      value: function(d) { return d.net_total_recv; },
      color: "rgba(224, 188, 188, 1)",
      text: "Net Down"
    }, {
      scale: d3.scale.linear().domain([0, maxes.net_total_send]),
      value: function(d) { return d.net_total_send; },
      color: "rgba(102, 140, 178, 0.75)",
      text: "Net Up",
      type: "line"
    }]);
  }

  if ('dsk_total_read' in row && 'dsk_total_writ' in row) {
    lanes.push([{
      scale: d3.scale.linear().domain([0, maxes.dsk_total_read]),
      value: function(d) { return d.dsk_total_read; },
      color: "rgba(224, 188, 188, 1)",
      text: "Disk Read",
      type: "line"
    }, {
      scale: d3.scale.linear().domain([0, maxes.dsk_total_writ]),
      value: function(d) { return d.dsk_total_writ; },
      color: "rgba(102, 140, 178, 0.75)",
      text: "Disk Write",
      type: "line"
    }]);
  }

  return lanes;
};

function timelineDstat() {
  var link = function(scope, el, attrs, timelineController) {
    var margin = timelineController.margin;
    var height = 140;
    var lanes = [];
    var laneHeight = 30;

    var chart = d3.select(el[0])
        .append('svg')
        .attr('width', timelineController.width + margin.left + margin.right)
        .attr('height', height)
        .style('display', 'none');

    var main = chart.append('g')
        .attr('transform', 'translate(' + margin.left + ',0)');

    var xSelected = timelineController.axes.selection;
    var y = d3.scale.linear();

    var update = function() {
      if (lanes.length === 0) {
        return;
      }

      var extent = timelineController.viewExtents;
      var minExtent = extent[0];
      var maxExtent = extent[1];

      var entries = timelineController.dstat.entries;
      var timeFunc = function(d) { return d.system_time; };

      var visibleEntries = entries.slice(
        arrayUtil.binaryMinIndex(minExtent, entries, timeFunc),
        arrayUtil.binaryMaxIndex(maxExtent, entries, timeFunc)
      );

      // apply the current dataset (visibleEntries) to each dstat path
      lanes.forEach(function(lane) {
        lane.forEach(function(pathDef) {
          pathDef.path
              .datum(visibleEntries)
              .attr("d", pathDef.area);
        });
      });
    };

    var initLane = function(lane, i) {
      var laneGroup = main.append('g');

      var text = laneGroup.append('text')
          .attr('y', y(i + 0.5))
          .attr('dy', '0.5ex')
          .attr('text-anchor', 'end')
          .style('font', '10px sans-serif');

      var dy = 0;

      lane.forEach(function(pathDef) {
        var laneHeight = 0.8 * y(1);
        pathDef.scale.range([laneHeight, 0]);

        if ('text' in pathDef) {
          text.append('tspan')
              .attr('x', -margin.right)
              .attr('dy', dy)
              .text(pathDef.text)
              .attr('fill', pathDef.color);

          dy += 10;
        }

        pathDef.path = laneGroup.append('path');
        if (pathDef.type === 'line') {
          pathDef.area = d3.svg.line()
              .x(function(d) { return xSelected(d.system_time); })
              .y(function(d) {
                return y(i) + pathDef.scale(pathDef.value(d));
              });

          pathDef.path
              .style('stroke', pathDef.color)
              .style('stroke-width', '1.5px')
              .style('fill', 'none');
        } else {
          pathDef.area = d3.svg.area()
              .x(function(d) { return xSelected(d.system_time); })
              .y0(y(i) + laneHeight)
              .y1(function(d) {
                return y(i) + pathDef.scale(pathDef.value(d));
              });

          pathDef.path.style('fill', pathDef.color);
        }
      });
    };

    scope.$on('dstatLoaded', function(event, dstat) {
      lanes = getDstatLanes(dstat.entries, dstat.minimums, dstat.maximums);
      laneHeight = height / (lanes.length + 1);

      y.domain([0, lanes.length]).range([0, height]);

      lanes.forEach(initLane);

      chart.style('display', 'block');
    });

    scope.$on('update', function() {
      chart.attr('width', timelineController.width + margin.left + margin.right);
      update(timelineController.dstat);
    });

    scope.$on('updateView', function() {
      update(timelineController.dstat);
    });
  };

  return {
    restrict: 'E',
    require: '^timeline',
    scope: true,
    link: link
  };
}

directivesModule.directive('timelineDstat', timelineDstat);
