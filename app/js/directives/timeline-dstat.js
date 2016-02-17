'use strict';

var directivesModule = require('./_index.js');

var arrayUtil = require('../util/array-util');
var parseDstat = require('../util/dstat-parse');
var d3 = require('d3');

var getDstatLanes = function(data, mins, maxes) {
  if (!data || !data.length) {
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

function timelineDstat($document, $window) {
  var link = function(scope, el, attrs, timelineController) {
    // local display variables
    var margin = timelineController.margin;
    var height = 140;
    var laneDefs = [];
    var laneHeight = 30;
    var loaded = false;

    // axes and dstat-global variables
    var absolute = timelineController.axes.absolute;
    var xSelected = timelineController.axes.selection;
    var y = d3.scale.linear();

    // animation variables
    var currentViewExtents = null;
    var viewInterpolator = null;
    var easeOutCubic = d3.ease('cubic-out');
    var easeStartTimestamp = null;
    var easeDuration = 500;

    // canvases and layers
    var regions = [];
    var lanes = timelineController.createCanvas(null, height);
    var main = timelineController.createCanvas(null, height, false);
    el.append(main.canvas);

    /**
     * Generate the list of active regions or "chunks". These regions span a
     * fixed area of the timeline's full "virtual" width, and contain only a
     * small subset of data points that fall within the area. This function only
     * initializes a list of regions, but does not actually attempt to draw
     * anything. Drawing can be handled lazily and will only occur when a
     * region's 'dirty' property is set. If a list of regions already exists,
     * it will be thrown away and replaced with a new list; this should occur
     * any time the full "virtual" timeline width changes (such as a extent
     * resize), or if the view extents no longer fall within the generated list
     * of regions.
     *
     * This function will limit the number of generated regions. If this is not
     * sufficient to cover the entire area spanned by the timeline's virtual
     * width, regions will be generated around the user's current viewport.
     *
     * Note that individual data points will exist within multiple regions if
     * they span region borders. In this case, each containing region will have
     * a unique rect instance pointing to the same data point.
     */
    function createRegions() {
      regions = [];

      var fullWidth = absolute(timelineController.timeExtents[1]);
      var chunkWidth = 500;
      var chunks = Math.ceil(fullWidth / chunkWidth);
      var offset = 0;

      // avoid creating lots of chunks - cap and only generate around the
      // current view
      // if we scroll out of bounds of the chunks we *do* have, we can throw
      // away our regions + purge regions in memory
      if (chunks > 30) {
        var startX = absolute(timelineController.viewExtents[0]);
        var endX = absolute(timelineController.viewExtents[1]);
        var midX = startX + (endX - startX) / 2;

        chunks = 50;
        offset = Math.max(0, midX - (chunkWidth * 15));
      }

      for (var i = 0; i < chunks; i++) {
        // for each desired chunk, find the bounds and managed data points
        // then, calculate positions for each data point
        var w = Math.min(fullWidth - offset, chunkWidth);
        var min = absolute.invert(offset);
        var max = absolute.invert(offset + w);
        var data = timelineController.dstatInBounds(min, max);

        regions.push({
          x: offset, width: w, min: min, max: max,
          data: data,
          c: null,
          dirty: true,
          index: regions.length
        });

        offset += w;
      }
    }

    /**
     * Finds all regions falling within the given minimum and maximum absolute
     * x coordinates.
     * @param  {number} minX the minimum x coordinate (exclusive)
     * @param  {number} maxX the maximum x coording (exclusive)
     * @return {object[]}    a list of matching regions
     */
    function getContainedRegions(minX, maxX) {
      return regions.filter(function(region) {
        return (region.x + region.width) > minX && region.x < maxX;
      });
    }

    /**
     * Draw lane labels into the offscreen lanes canvas.
     */
    function drawLanes() {
      // make sure the canvas is the correct size and clear it
      lanes.resize(timelineController.width + margin.left + margin.right);
      lanes.ctx.clearRect(0, 0, lanes.canvas.width, lanes.canvas.height);

      lanes.ctx.strokeStyle = 'lightgray';
      lanes.ctx.textAlign = 'end';
      lanes.ctx.textBaseline = 'middle';
      lanes.ctx.font = '10px sans-serif';

      // draw lanes for each worker
      var laneHeight = 0.8 * y(1);
      for (var i = 0; i < laneDefs.length; i++) {
        var laneDef = laneDefs[i];
        var yPos = y(i + 0.5);
        var dy = 0;

        for (var pathIndex = 0; pathIndex < laneDef.length; pathIndex++) {
          var pathDef = laneDef[pathIndex];
          pathDef.scale.range([laneHeight, 0]);

          // draw labels right-aligned to the left of each lane
          if ('text' in pathDef) {
            lanes.ctx.fillStyle = pathDef.color;
            lanes.ctx.fillText(
                pathDef.text,
                margin.left - margin.right, yPos + dy,
                margin.left - 10);

            dy += 10;
          }
        }
      }
    }

    /**
     * Draw the given region into its own canvas. The region will only be drawn
     * if it is marked as dirty. If its canvas has not yet been created, it will
     * be initialized automatically. Note that this does not actually draw
     * anything to the screen (i.e. main canvas), as this result only populates
     * each region's local offscreen image with content. drawAll() will actually
     * draw to the screen (and implicitly calls this function as well).
     * @param {object} region the region to draw
     */
    function drawRegion(region) {
      if (!region.dirty) {
        // only redraw if dirty
        return;
      }

      if (!region.c) {
        // create the actual image buffer lazily - don't waste memory if it will
        // never be seen
        region.c = timelineController.createCanvas(region.width, height);
      }

      var ctx = region.c.ctx;
      ctx.clearRect(0, 0, region.width, height);
      ctx.strokeStyle = 'rgb(175, 175, 175)';
      ctx.lineWidth = 1;

      for (var laneIndex = 0; laneIndex < laneDefs.length; laneIndex++) {
        var laneDef = laneDefs[laneIndex];
        var bottom = y(laneIndex) + laneHeight;

        for (var pathIndex = 0; pathIndex < laneDef.length; pathIndex++) {
          if (!region.data.length) {
            continue;
          }

          var pathDef = laneDef[pathIndex];
          var line = pathDef.type === 'line';

          ctx.strokeStyle = pathDef.color;
          ctx.fillStyle = pathDef.color;

          var first = region.data[0];
          ctx.beginPath();
          ctx.moveTo(
              absolute(+first.system_time) - region.x,
              y(laneIndex) + pathDef.scale(pathDef.value(first)));

          for (var i = 1; i < region.data.length; i++) {
            var d = region.data[i];

            ctx.lineTo(
                absolute(+d.system_time) - region.x,
                y(laneIndex) + pathDef.scale(pathDef.value(d)));
          }

          if (line) {
            ctx.stroke();
          } else {
            var last = region.data[region.data.length - 1];
            ctx.lineTo(absolute(+last.system_time) - region.x, bottom);
            ctx.lineTo(absolute(+first.system_time) - region.x, bottom);
            ctx.fill();
          }
        }
      }

      region.dirty = false;
    }

    /**
     * Draw all layers and visible regions on the screen.
     */
    function drawAll() {
      if (!currentViewExtents) {
        currentViewExtents = timelineController.viewExtents;
      }

      // update size of main canvas
      var w = timelineController.width + margin.left + margin.right;
      var e = angular.element(main.canvas);
      main.resize(w);

      var s = function(v) {
        return v * main.ratio;
      };

      main.ctx.clearRect(0, 0, main.canvas.width, main.canvas.height);
      main.ctx.drawImage(lanes.canvas, 0, 0);

      // draw all visible regions
      var startX = absolute(currentViewExtents[0]);
      var endX = absolute(currentViewExtents[1]);
      var viewRegions = getContainedRegions(startX, endX);

      var effectiveWidth = 0;
      viewRegions.forEach(function(region) {
        effectiveWidth += region.width;
      });

      if (effectiveWidth < timelineController.width) {
        // we had to cap the region generation previously, but moved outside of
        // the generated area, so regenerate regions around the current view
        createRegions();
        viewRegions = getContainedRegions(startX, endX);
      }

      viewRegions.forEach(function(region) {
        drawRegion(region);

        // calculate the cropping area and offsets needed to place the region
        // in the main canvas
        var sx1 = Math.max(0, startX - region.x);
        var sx2 = Math.min(region.width, endX - region.x);
        var sw = sx2 - sx1;
        var dx = Math.max(0, startX - region.x);
        if (Math.floor(sw) === 0) {
          return;
        }

        main.ctx.drawImage(
            region.c.canvas,
            s(sx1), 0, Math.floor(s(sw)), s(height),
            s(margin.left + region.x - startX + sx1), 0, s(sw), s(height));
      });
    }

    timelineController.animateCallbacks.push(function(timestamp) {
      if (!loaded) {
        return false;
      }

      if (viewInterpolator) {
        // start the animation
        var currentSize = currentViewExtents[1] - currentViewExtents[0];
        var newSize = timelineController.viewExtents[1] - timelineController.viewExtents[0];
        var diffSize = currentSize - newSize;
        var diffTime = timestamp - easeStartTimestamp;
        var pct = diffTime / easeDuration;

        // interpolate the current view bounds according to the easing method
        currentViewExtents = viewInterpolator(easeOutCubic(pct));

        if (Math.abs(diffSize) > 1) {
          // size has changed, recalculate regions
          createRegions();
        }

        drawAll();

        if (pct >= 1) {
          // finished, clear the state vars
          easeStartTimestamp = null;
          viewInterpolator = null;
          return false;
        } else {
          // request more frames until finished
          return true;
        }
      } else {
        // if there is no view interpolator function, just do a plain redraw
        drawAll();
        return false;
      }
    });

    scope.$on('dstatLoaded', function(event, dstat) {
      laneDefs = getDstatLanes(dstat.entries, dstat.minimums, dstat.maximums);
      laneHeight = height / (laneDefs.length + 1);
      y.domain([0, laneDefs.length]).range([0, height]);
      drawLanes();
      createRegions();

      loaded = true;
    });

    scope.$on('update', function() {
      if (!loaded) {
        return;
      }

      drawLanes();
      createRegions();
      timelineController.animate();
    });

    scope.$on('updateViewSize', function() {
      if (!loaded) {
        return;
      }

      if (currentViewExtents) {
        // if we know where the view is already, try to animate the transition
        viewInterpolator = d3.interpolate(
            currentViewExtents,
            timelineController.viewExtents);
        easeStartTimestamp = performance.now();
      } else {
        // otherwise, move directly to the new location/size (we will need to
        // rebuild regions)
        createRegions();
      }

      timelineController.animate();
    });

    scope.$on('updateViewPosition', function() {
      if (!loaded) {
        return;
      }

      if (currentViewExtents) {
        // if we know where the view is already, try to animate the transition
        viewInterpolator = d3.interpolate(
            currentViewExtents,
            timelineController.viewExtents);
        easeStartTimestamp = performance.now();
      }

      timelineController.animate();
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
