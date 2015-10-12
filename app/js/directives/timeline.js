'use strict';

var directivesModule = require('./_index.js');

var arrayUtil = require('../util/array-util');
var parseDstat = require('../util/dstat-parse');
var d3 = require('d3');

var statusColorMap = {
  "success": "LightGreen",
  "fail": "Crimson",
  "skip": "DodgerBlue"
};

var parseWorker = function(tags) {
  for (var i = 0; i < tags.length; i++) {
    if (!tags[i].startsWith("worker")) {
      continue;
    }

    return parseInt(tags[i].split("-")[1]);
  }

  return null;
};

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

/**
 * @ngInject
 */
function timeline(datasetService) {
  var link = function(scope, el, attrs) {
    var data = [];
    var dstat = {};
    var timeExtents = [];

    var margin = { top: 20, right: 10, bottom: 10, left: 80 };
    var width = el.parent()[0].clientWidth - margin.left - margin.right;
    var height = 550 - margin.top - margin.bottom;

    var miniHeight = 0;
    var dstatHeight = 0;
    var mainHeight = 0;

    // primary x axis, maps time -> screen x
    var x = d3.time.scale().range([0, width]);

    // secondary x axis, maps time (in selected range) -> screen x
    var xSelected = d3.scale.linear().range([0, width]);

    // y axis for lane positions within main
    var yMain = d3.scale.linear();

    // y axis for dstat lane positions
    var yDstat = d3.scale.linear();

    // y axis for lane positions within mini
    var yMini = d3.scale.linear();

    var chart = d3.select(el[0])
        .append('svg')
        .attr('width', '100%')
        .attr('height', height + margin.top + margin.bottom);

    var defs = chart.append('defs')
        .append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('width', width); // TODO: set height later

    var main = chart.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .attr('width', width); // TODO: set height later

    var laneLines = main.append('g');
    var laneLabels = main.append('g');

    var itemGroups = main.append('g');

    var dstatLanes = [];
    var dstatGroup = chart.append('g').attr('width', width);

    var mini = chart.append('g').attr('width', width);
    var miniGroups = mini.append('g');

    // delay init of the brush until we know the extents, otherwise it won't
    // init properly
    var brush = null;

    var selectedRect = null;

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

    var updateLanes = function() {
      var lines = laneLines.selectAll('.laneLine')
          .data(data, function(d) { return d.key; });

      lines.enter().append('line')
          .attr('x1', 0)
          .attr('x2', width)
          .attr('stroke', 'lightgray')
          .attr('class', 'laneLine');

      lines.attr('y1', function(d, i) { return yMain(i - 0.1); })
          .attr('y2', function(d, i) { return yMain(i - 0.1); });

      lines.exit().remove();

      var labels = laneLabels.selectAll('.laneLabel')
          .data(data, function(d) { return d.key; });

      labels.enter().append('text')
          .text(function(d) { return 'Worker #' + d.key; })
          .attr('x', -margin.right)
          .attr('dy', '.5ex')
          .attr('text-anchor', 'end')
          .attr('class', 'laneLabel');

      labels.attr('y', function(d, i) { return yMain(i + 0.5); });
      labels.exit().remove();

      cursor.attr('y2', yMain(data.length - 0.1));
    };

    var updateItems = function() {
      var minExtent = brush.extent()[0];
      var maxExtent = brush.extent()[1];

      // filter visible items to include only those within the current extent
      // additionally prune extremely small values to improve performance
      var visibleItems = data.map(function(group) {
        return {
          key: group.key,
          values: group.values.filter(function(e) {
            if (xSelected(e.endDate) - xSelected(e.startDate) < 2) {
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
          .attr('y', function(d) { return yMain(parseWorker(d.tags)); })
          .attr('height', 0.8 * yMain(1))
          .attr('stroke', 'rgba(100, 100, 100, 0.25)')
          .attr('clip-path', 'url(#clip)');

      rects
          .attr('x', function(d) {
            return xSelected(d.startDate);
          })
          .attr('width', function(d) {
            return xSelected(d.endDate) - xSelected(d.startDate);
          })
          .attr('fill', function(d) { return statusColorMap[d.status]; })
          .on("mouseover", function(d) {
            if (selectedRect !== null) {
              return;
            }

            scope.hoveredItem = d;
            scope.$apply();

            var self = d3.select(this);
            if (!self.attr('data-old-fill')) {
              self.attr('data-old-fill', self.attr('fill'));
            }

            self.attr('fill', 'darkturquoise');
          })
          .on('mouseout', function(d) {
            if (selectedRect !== null) {
              return;
            }

            scope.hoveredItem = null;
            scope.$apply();

            var self = d3.select(this);
            if (self.attr('data-old-fill')) {
              self.attr('fill', self.attr('data-old-fill'));
              self.attr('data-old-fill', null);
            }
          })
          .on('click', function(d) {
            var self = d3.select(this);
            if (selectedRect) {
              if (selectedRect.attr('data-old-fill')) {
                selectedRect.attr('fill', selectedRect.attr('data-old-fill'));
                selectedRect.attr('data-old-fill', null);
              }

              if (scope.selectedItem.name === d.name) {
                scope.selectedItem = null;
                scope.$apply();

                selectedRect = null;
                return;
              }
            }

            scope.selectedItem = d;
            scope.$apply();

            selectedRect = self;

            if (!self.attr('data-old-fill')) {
              self.attr('data-old-fill', self.attr('fill'));
            }

            self.attr('fill', 'goldenrod');
          });

      rects.exit().remove();
      groups.exit().remove();
    };

    var updateDstat = function() {
      if (dstatLanes.length === 0) {
        return;
      }

      var minExtent = brush.extent()[0];
      var maxExtent = brush.extent()[1];

      var timeFunc = function(d) { return d.system_time; };

      var visibleEntries = dstat.entries.slice(
        arrayUtil.binaryMinIndex(minExtent, dstat.entries, timeFunc),
        arrayUtil.binaryMaxIndex(maxExtent, dstat.entries, timeFunc)
      );

      // apply the current dataset (visibleEntries) to each dstat path
      dstatLanes.forEach(function(lane) {
        lane.forEach(function(pathDef) {
          pathDef.path
              .datum(visibleEntries)
              .attr("d", pathDef.area);
        });
      });
    };

    var update = function() {
      if (!data) {
        return;
      }

      xSelected.domain(brush.extent());

      updateLanes();
      updateItems();
      updateDstat();
    };

    var updateMiniItems = function() {
      var groups = miniGroups.selectAll("g")
          .data(data, function(d) { return d.key; });

      groups.enter().append("g");

      var rects = groups.selectAll("rect").data(
          function(d) { return d.values; },
          function(d) { return d.name; });

      rects.enter().append("rect")
          .attr("y", function(d) { return yMini(parseWorker(d.tags) + 0.5) - 5; })
          .attr("height", 10);

      rects.attr("x", function(d) { return x(d.startDate); })
          .attr("width", function(d) { return x(d.endDate) - x(d.startDate); })
          .attr("stroke", 'rgba(100, 100, 100, 0.25)')
          .attr("fill", function(d) { return statusColorMap[d.status]; });

      rects.exit().remove();
      groups.exit().remove();
    };

    var initChart = function() {
      // determine lanes available based on current data
      dstatLanes = getDstatLanes(dstat.entries, dstat.minimums, dstat.maximums);

      // determine region sizes that depend on available datasets
      miniHeight = data.length * 12 + 30;
      dstatHeight = dstatLanes.length * 30 + 30;
      mainHeight = height - miniHeight - dstatHeight - 10;

      // update scales based on data and calculated heights
      x.domain(timeExtents);
      yMain.domain([0, data.length]).range([0, mainHeight]);
      yDstat.domain([0, dstatLanes.length]).range([0, dstatHeight]);
      yMini.domain([0, data.length]).range([0, miniHeight]);

      // apply calculated heights to group sizes and transforms
      defs.attr('height', mainHeight);
      main.attr('height', mainHeight);
      cursor.attr('y1', yMain(-0.1));

      var dstatOffset = margin.top + mainHeight;
      dstatGroup
          .attr('height', dstatHeight)
          .attr('transform', 'translate(' + margin.left + ',' + dstatOffset + ')');

      var miniOffset = margin.top + mainHeight + dstatHeight;
      mini.attr('height', mainHeight)
          .attr('transform', 'translate(' + margin.left + ',' + miniOffset + ')');

      // set initial selection extents to 1/8 the total size
      // this helps with performance issues in some browsers when displaying
      // large datasets (e.g. recent Firefox on Linux)
      var start = timeExtents[0];
      var end = timeExtents[1];
      var reducedEnd = new Date(start.getTime() + (end - start) / 8);

      brush = d3.svg.brush()
          .x(x)
          .extent([start, reducedEnd])
          .on('brush', update);

      var brushElement = mini.append('g')
          .call(brush)
          .selectAll('rect')
          .attr('y', 1)
          .attr('fill', 'dodgerblue')
          .attr('fill-opacity', 0.365);

      brushElement.attr('height', miniHeight - 1);

      // init dstat lanes
      dstatLanes.forEach(function(lane, i) {
        var laneGroup = dstatGroup.append('g');

        var text = laneGroup.append('text')
            .attr('y', yDstat(i + 0.5))
            .attr('dy', '0.5ex')
            .attr('text-anchor', 'end')
            .style('font', '10px sans-serif');

        var dy = 0;

        lane.forEach(function(pathDef) {
          var laneHeight = 0.8 * yDstat(1);
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
                  return yDstat(i) + pathDef.scale(pathDef.value(d));
                });

            pathDef.path
                .style('stroke', pathDef.color)
                .style('stroke-width', '1.5px')
                .style('fill', 'none');
          } else {
            pathDef.area = d3.svg.area()
                .x(function(d) { return xSelected(d.system_time); })
                .y0(yDstat(i) + laneHeight)
                .y1(function(d) {
                  return yDstat(i) + pathDef.scale(pathDef.value(d));
                });

            pathDef.path.style('fill', pathDef.color);
          }
        });
      });

      // finalize chart init
      updateMiniItems();
      update();
    };

    var initData = function(raw, dstatRaw) {
      // find data extents
      var minStart = null;
      var maxEnd = null;

      raw.forEach(function(d) {
        d.startDate = new Date(d.timestamps[0]);
        if (minStart === null || d.startDate < minStart) {
          minStart = d.startDate;
        }

        d.endDate = new Date(d.timestamps[1]);
        if (maxEnd === null || d.endDate > maxEnd) {
          maxEnd = d.endDate;
        }
      });

      // define a nested data structure with groups by worker, and fill using
      // entries w/ duration > 0
      data = d3.nest()
          .key(function(d) { return parseWorker(d.tags); })
          .sortKeys(d3.ascending)
          .entries(raw.filter(function(d) { return d.duration > 0; }));

      var accessor = function(d) { return d.system_time; };
      var minIndex = arrayUtil.binaryMinIndex(minStart, dstatRaw.entries, accessor);
      var maxIndex = arrayUtil.binaryMaxIndex(maxEnd, dstatRaw.entries, accessor);

      dstat = {
        entries: dstatRaw.entries.slice(minIndex, maxIndex),
        minimums: dstatRaw.minimums,
        maximums: dstatRaw.maximums
      };
      timeExtents = [ minStart, maxEnd ];

      initChart();
    };

    chart.on('mouseout', function() {
      cursorGroup.style('opacity', 0);
    });

    chart.on('mousemove', function() {
      var pos = d3.mouse(this);
      var px = pos[0];
      var py = pos[1];

      if (px >= margin.left && px < (width + margin.left) &&
          py > margin.top && py < (mainHeight + margin.top)) {
        var relX = px - margin.left;
        var currentTime = new Date(xSelected.invert(relX));

        cursorGroup
            .style('opacity', '0.5')
            .attr('transform', 'translate(' + relX + ', 0)');

        cursorText.text(d3.time.format('%X')(currentTime));
      }
    });

    scope.$on('windowResize', function() {
      var extent = brush.extent();

      width = el.parent()[0].clientWidth - margin.left - margin.right;
      x.range([0, width]);
      xSelected.range([0, width]);

      chart.attr('width', el.parent()[0].clientWidth);
      defs.attr('width', width);
      main.attr('width', width);
      mini.attr('width', width);
      // TODO: dstat?

      laneLines.selectAll('.laneLine').attr('x2', width);

      brush.extent(extent);

      updateMiniItems();
      update();
    });

    scope.$watch('dataset', function(dataset) {
      if (!dataset) {
        return;
      }

      var raw = null;
      var dstat = null;

      // load both datasets
      datasetService.raw(dataset).then(function(response) {
        raw = response.data;
        return datasetService.dstat(dataset);
      }).then(function(response) {
        var firstDate = new Date(raw[0].timestamps[0]);
        dstat = parseDstat(response.data, firstDate.getYear());
      }).finally(function() {
        // display as much as we were able to load
        // (dstat may not exist, but that's okay)
        initData(raw, dstat);
      }).catch(function(ex) {
        console.error(ex);
      });
    });
  };

  return {
    restrict: 'EA',
    scope: {
      'dataset': '=',
      'hoveredItem': '=',
      'selectedItem': '='
    },
    link: link
  };
}

directivesModule.directive('timeline', timeline);
