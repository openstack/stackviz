'use strict';

var directivesModule = require('./_index.js');

var d3 = require('d3');

function timelineOverview() {
  var link = function(scope, el, attrs, timelineController) {
    var margin = timelineController.margin;
    var height = 80;
    var laneHeight = 10;

    var x = timelineController.axes.x;
    var y = d3.scale.linear();

    var brush = null;

    var chart = d3.select(el[0])
        .append('svg')
        .attr('height', height)
        .style('position', 'relative')
        .style('width', timelineController.width)
        .style('left', margin.left)
        .style('right', margin.right);

    var groups = chart.append('g');

    var updateBrush = function() {
      timelineController.setViewExtents(brush.extent());
    };

    var updateItems = function(data) {
      var lanes = groups
          .selectAll('g')
          .data(data, function(d) { return d.key; });

      lanes.enter().append('g');

      var rects = lanes.selectAll('rect').data(
          function(d) { return d.values; },
          function(d) { return d.name; });

      rects.enter().append('rect')
          .attr('y', function(d) { return y(d.worker + 0.5) - 5; })
          .attr('height', laneHeight);

      rects.attr('x', function(d) { return x(d.startDate); })
          .attr('width', function(d) { return x(d.endDate) - x(d.startDate); })
          .attr('stroke', 'rgba(100, 100, 100, 0.25)')
          .attr('fill', function(d) {
            return timelineController.statusColorMap[d.status];
          });

      rects.exit().remove();
      lanes.exit().remove();
    };

    var centerViewport = function(date) {
      // explicitly center the viewport on a date
      var timeExtents = timelineController.timeExtents;
      var start = timeExtents[0];
      var end = timeExtents[1];

      if (date < start || date > end) {
        return false;
      }

      var viewExtents = timelineController.viewExtents;
      var size = viewExtents[1] - viewExtents[0];

      var targetStart = math.max(start.getTime(), date - (size / 2));
      targetStart = Math.min(targetStart, end.getTime() - size);
      var targetEnd = begin + extentSize;

      brush.extent([targetStart, targetEnd]);
      chart.select('.brush').call(brush);
      updateBrush();

      return true;
    };

    var shiftViewport = function(item) {
      // shift the viewport left/right to fit an item
      // unlike centerViewport() this only moves the view extents far enough to
      // make an item fit entirely in the view, but will not center it
      // if the item is already fully contained in the view, this does nothing
      var timeExtents = timelineController.timeExtents;
      var start = timeExtents[0];
      var end = timeExtents[1];

      var viewExtents = timelineController.viewExtents;
      var viewStart = viewExtents[0];
      var viewEnd = viewExtents[1];
      if (item.startDate >= viewStart && item.endDate <= viewEnd) {
        return false;
      }

      var size = viewEnd - viewStart;
      var currentMid = viewStart.getTime() + (size / 2);
      var targetMid = item.startDate.getTime() + (item.endDate - item.startDate) / 2;

      var targetStart, targetEnd;
      if (targetMid > currentMid) {
        // move right - anchor item end to view right
        targetEnd = item.endDate.getTime();
        targetStart = Math.max(start.getTime(), targetEnd - size);
      } else if (targetMid < currentMid) {
        // move left - anchor item start to view left
        targetStart = item.startDate.getTime();
        targetEnd = Math.min(end.getTime(), targetStart + size);
      } else {
        return false;
      }

      brush.extent([targetStart, targetEnd]);
      chart.select('.brush').call(brush);
      updateBrush();

      return true;
    };

    scope.$on('dataLoaded', function(event, data) {
      laneHeight = height / (data.length + 1);

      var timeExtents = timelineController.timeExtents;
      var start = timeExtents[0];
      var end = timeExtents[1];
      var reducedEnd = new Date(start.getTime() + (end - start) / 8);

      y.domain([0, data.length]).range([0, height]);

      brush = d3.svg.brush()
          .x(timelineController.axes.x)
          .extent([start, reducedEnd])
          .on('brush', updateBrush);

      var brushElement = chart.append('g')
          .attr('class', 'brush')
          .call(brush)
          .selectAll('rect')
          .attr('y', 1)
          .attr('fill', 'dodgerblue')
          .attr('fill-opacity', 0.365)
          .attr('height', height - 1);

      timelineController.setViewExtents(brush.extent());
    });

    scope.$on('update', function() {
      chart.style('width', timelineController.width);
      updateItems(timelineController.data);
    });

    scope.$on('updateView', function() {
      updateItems(timelineController.data);
    });

    scope.$on('select', function(event, selection) {
      if (selection) {
        shiftViewport(selection.item);
      }
    });
  };

  return {
    restrict: 'E',
    require: '^timeline',
    scope: true,
    link: link
  };
}

directivesModule.directive('timelineOverview', timelineOverview);
