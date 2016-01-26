'use strict';

var directivesModule = require('./_index.js');

var d3 = require('d3');

/**
 * @ngInject
 */
function timelineViewport($document) {
  var link = function(scope, el, attrs, timelineController) {
    var margin = timelineController.margin;
    var height = 200;
    var loaded = false;

    var y = d3.scale.linear();
    var xSelected = timelineController.axes.selection;

    var statusColorMap = timelineController.statusColorMap;

    var chart = d3.select(el[0])
        .append('svg')
        .attr('width', timelineController.width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    var defs = chart.append('defs')
        .append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('width', timelineController.width);

    var main = chart.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var laneLines = main.append('g');
    var laneLabels = main.append('g');

    var itemGroups = main.append('g');

    var cursorGroup = main.append('g')
        .style('opacity', 0)
        .style('pointer-events', 'none');

    var cursor = cursorGroup.append('line')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('stroke', 'blue');

    var cursorText = cursorGroup.append('text')
        .attr('x', 0)
        .attr('y', -10)
        .attr('dy', '-.5ex')
        .style('text-anchor', 'middle')
        .style('font', '9px sans-serif');

    var cursorItemText = cursorGroup.append('text')
        .attr('x', 0)
        .attr('y', -22)
        .attr('dy', '-.5ex')
        .style('text-anchor', 'middle')
        .style('font', '12px sans-serif')
        .style('font-weight', 'bold');

    var format = d3.time.format('%H:%M');
    var axis = d3.svg.axis()
        .scale(xSelected)
        .tickSize(5)
        .tickFormat(function(f) { return format(new Date(f)); })
        .orient('bottom');

    var axisGroup = chart.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(' + margin.left + ',' + (height + margin.top) + ')')
        .attr('clip-path', 'url(#clip)')
        .call(axis);

    var selectedRect = null;

    var color = function(rect, color) {
      if (!rect.attr('data-old-fill')) {
        rect.attr('data-old-fill', rect.attr('fill'));
      }

      rect.attr('fill', color);
    };

    var uncolor = function(rect) {
      if (!$document[0].contains(rect[0][0])) {
        // we lost the original colored rect so we can't unset its color,
        // force a full reload
        updateItems(timelineController.data);
        return;
      }

      if (rect.attr('data-old-fill')) {
        rect.attr('fill', rect.attr('data-old-fill'));
        rect.attr('data-old-fill', null);
      }
    };

    var rectMouseOver = function(d) {
      timelineController.setHover(d);
      scope.$apply();

      if (!timelineController.selection
          || d !== timelineController.selection.item) {
        color(d3.select(this), statusColorMap.hover);
      }
    };

    var rectMouseOut = function(d) {
      timelineController.clearHover();
      scope.$apply();

      if (!timelineController.selection
          || d !== timelineController.selection.item) {
        var self = d3.select(this);
        uncolor(d3.select(this));
      }
    };

    var rectClick = function(d) {
      timelineController.selectItem(d);
      scope.$apply();
    };

    var updateLanes = function(data) {
      var lines = laneLines.selectAll('.laneLine')
          .data(data, function(d) { return d.key; });

      lines.enter().append('line')
          .attr('x1', 0)
          .attr('x2', timelineController.width)
          .attr('stroke', 'lightgray')
          .attr('class', 'laneLine');

      lines.attr('y1', function(d, i) { return y(i - 0.1); })
          .attr('y2', function(d, i) { return y(i - 0.1); });

      lines.exit().remove();

      var labels = laneLabels.selectAll('.laneLabel')
          .data(data, function(d) { return d.key; });

      labels.enter().append('text')
          .text(function(d) { return 'Worker #' + d.key; })
          .attr('x', -margin.right)
          .attr('dy', '.5ex')
          .attr('text-anchor', 'end')
          .attr('class', 'laneLabel');

      labels.attr('y', function(d, i) { return y(i + 0.5); });
      labels.exit().remove();

      cursor.attr('y2', y(data.length - 0.1));
    };

    var updateItems = function(data) {
      var extent = timelineController.viewExtents;
      var minExtent = extent[0];
      var maxExtent = extent[1];

      // filter visible items to include only those within the current extent
      // additionally prune extremely small values to improve performance
      var visibleItems = data.map(function(group) {
        return {
          key: group.key,
          values: group.values.filter(function(e) {
            if (timelineController.hidden(e)) {
              return false;
            }

            if (e.startDate > maxExtent || e.endDate < minExtent) {
              return false;
            }

            return true;
          })
        };
      });

      var groups = itemGroups.selectAll("g")
          .data(visibleItems, function(d) { return d.key; });

      groups.enter().append("g");

      var rects = groups.selectAll("rect")
          .data(function(d) { return d.values; }, function(d) { return d.name; });

      rects.enter().append("rect")
          .attr('y', function(d) { return y(d.worker); })
          .attr('height', 0.8 * y(1))
          .attr('stroke', 'rgba(100, 100, 100, 0.25)')
          .attr('clip-path', 'url(#clip)');

      rects
          .attr('x', function(d) {
            return xSelected(d.startDate);
          })
          .attr('width', function(d) {
            return xSelected(d.endDate) - xSelected(d.startDate);
          })
          .attr('fill', function(d) {
            if (timelineController.selectionName === d.name) {
              return statusColorMap.selected;
            } else {
              return statusColorMap[d.status];
            }
          })
          .attr('data-old-fill', function(d) {
            if (timelineController.selectionName === d.name) {
              return statusColorMap[d.status];
            } else {
              return null;
            }
          })
          .attr('class', function(d) {
            if (timelineController.filterFunction) {
              if (timelineController.filterFunction(d)) {
                return 'filter-hit';
              } else {
                return 'filter-miss';
              }
            } else {
              return null;
            }
          })
          .on("mouseover", rectMouseOver)
          .on('mouseout', rectMouseOut)
          .on('click', rectClick);

      rects.exit().remove();
      groups.exit().remove();
    };

    var update = function(data) {
      updateItems(timelineController.data);
      updateLanes(timelineController.data);

      axisGroup.call(axis);
    };

    var select = function(rect) {
      if (selectedRect) {
        uncolor(selectedRect);
      }

      selectedRect = rect;

      if (rect !== null) {
        color(rect, statusColorMap.selected);
      }
    };

    chart.on('mouseout', function() {
      cursorGroup.style('opacity', 0);
    });

    chart.on('mousemove', function() {
      var pos = d3.mouse(this);
      var px = pos[0];
      var py = pos[1];

      if (px >= margin.left && px < (timelineController.width + margin.left) &&
          py > margin.top && py < (height + margin.top)) {
        var relX = px - margin.left;
        var currentTime = new Date(xSelected.invert(relX));

        cursorGroup
            .style('opacity', '0.5')
            .attr('transform', 'translate(' + relX + ', 0)');

        cursorText.text(d3.time.format('%X')(currentTime));

        if (timelineController.hover) {
          var name = timelineController.hover.name.split('.').pop();
          cursorItemText.text(name);

          var width = cursorItemText.node().getComputedTextLength();
          var leftEdge = margin.left;
          var rightEdge = timelineController.width + margin.left;

          if (px + (width / 2) > rightEdge) {
            cursorItemText.attr('dx', -(px - (rightEdge - width / 2)));
          } else if (px - (width / 2) < leftEdge) {
            cursorItemText.attr('dx', (leftEdge + width / 2) - px);
          } else {
            cursorItemText.attr('dx', 0);
          }
        } else {
          cursorItemText.text('');
          cursorItemText.attr('dx', 0);
        }
      }
    });

    scope.$on('dataLoaded', function(event, data) {
      y.domain([0, data.length]).range([0, height]);

      defs.attr('height', height);
      cursor.attr('y1', y(-0.1));

      loaded = true;
    });

    scope.$on('update', function() {
      if (!loaded) {
        return;
      }

      chart.attr('width', timelineController.width + margin.left + margin.right);
      defs.attr('width', timelineController.width);

      update(timelineController.data);
    });

    scope.$on('updateView', function() {
      if (!loaded) {
        return;
      }

      update(timelineController.data);
    });

    scope.$on('postSelect', function(event, selection) {
      if (selection) {
        if (timelineController.hidden(selection.item)) {
          if (selectedRect) {
            uncolor(selectedRect);
          }
        } else {
          // iterate over all rects to find match
          itemGroups.selectAll('rect').each(function(d) {
            if (d.name === selection.item.name) {
              select(d3.select(this));
            }
          });
        }
      } else {
        select(null);
      }
    });

    scope.$on('filter', function() {
      if (loaded) {
        update();
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

directivesModule.directive('timelineViewport', timelineViewport);
