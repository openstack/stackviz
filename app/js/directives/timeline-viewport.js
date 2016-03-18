'use strict';

var directivesModule = require('./_index.js');
var arrayUtil = require('../util/array-util');

var d3 = require('d3');

/**
 * @ngInject
 */
function timelineViewport($document, $window) {
  var link = function(scope, el, attrs, timelineController) {
    // local display variables
    var margin = timelineController.margin;
    var statusColorMap = timelineController.statusColorMap;
    var height = 200;
    var loaded = false;

    // axes and timeline-global variables
    var y = d3.scale.linear();
    var absolute = timelineController.axes.absolute;
    var xSelected = timelineController.axes.selection;
    var cursorTimeFormat = d3.time.format('%X');
    var tickFormat = timelineController.axes.x.tickFormat();

    // animation variables
    var currentViewExtents = null;
    var viewInterpolator = null;
    var easeOutCubic = d3.ease('cubic-out');
    var easeStartTimestamp = null;
    var easeDuration = 500;

    // selection and hover variables
    var mousePoint = null;
    var selection = null;
    var hover = null;

    // canvases and layers
    var lanes = timelineController.createCanvas();
    var regions = [];
    var cursor = timelineController.createCanvas();
    var main = timelineController.createCanvas(null, null, false);
    el.append(main.canvas);

    /**
     * Initializes rects from a list of parsed subunit log entries, setting
     * initial sizes and positions based on the current view extents.
     * @param {Array} data A list of parsed subunit log entries
     */
    function createRects(data) {
      var rects = [];

      var h = 0.8 * y(1);
      for (var i = 0; i < data.length; i++) {
        var entry = data[i];
        var start = absolute(+entry.startDate);
        rects.push({
          x: start,
          y: y(entry.worker),
          width: absolute(+entry.endDate) - start,
          height: h,
          entry: entry
        });
      }

      return rects;
    }

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
        var data = timelineController.dataInBounds(min, max);
        var rects = createRects(data);

        regions.push({
          x: offset, width: w, min: min, max: max,
          data: data, rects: rects,
          c: null,
          dirty: true,
          index: regions.length
        });

        offset += w;
      }
    }

    /**
     * Marks all regions as dirty so they can be redrawn for the next frame.
     */
    function markAllDirty() {
      regions.forEach(function(region) {
        region.dirty = true;
      });
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
     * Get all regions containing the given data point.
     * @param  {object} entry the datapoint
     * @return {object[]}     a list of regions containing this entry
     */
    function getRegionsForEntry(entry) {
      var min = absolute(entry.startDate);
      var max = absolute(entry.endDate);
      return getContainedRegions(min, max);
    }

    /**
     * Get the rect corresponding to the given entry within a particular region.
     * @param  {object} region the region to search in
     * @param  {object} entry  the entry to search for
     * @return {object|null}   the matching rect, if any
     */
    function getRectForEntry(region, entry) {
      return region.rects.find(function(r) {
        return r.entry === entry;
      });
    }

    /**
     * Find the region managing the given canvas-local X coordinate. If the x
     * value is outside of the actual canvas area where regions are rendered,
     * this may return null. Rarely, null may also be returned if, while
     * animating, the view moves to a position outside of capped view bounds
     * (i.e. when the view extents are small); if this happens, it can be
     * ignored and createRegions() will generate the necessary area when the
     * animation finishes.
     * @param  {number} screenX the canvas-local x coordinate
     * @return {object|null}    the matching region or null
     */
    function getRegionAt(screenX) {
      if (screenX < margin.left || screenX > main.canvas.width - margin.right) {
        return null;
      }
      var absX = absolute(currentViewExtents[0]) + (screenX - margin.left);
      return regions.find(function(r) {
        return absX >= r.x && absX <= (r.x + r.width);
      });
    }

    /**
     * Get the rect at the given canvas-local coordinates, if any exists. This
     * function has the same limitations as getRegionAt() and will return null
     * when the coordinates are out of bounds or rarely when animating, but also
     * returns null when no rect exists at the given coords.
     *
     * Note that this will only search within the region containing the
     * coordinates so it should be fairly performant, though it will only return
     * one of possibly many matching rects.
     * @param  {number} screenX the canvas-local x coordinate
     * @param  {number} screenY the canvas-local y coordinate
     * @return {object|null}    the matching rect in the region or null
     */
    function getRectAt(screenX, screenY) {
      if (screenY < margin.top || screenY > main.canvas.height - margin.bottom) {
        return null;
      }

      var region = getRegionAt(screenX);
      if (!region) {
        return null;
      }

      // find the absolute coords in rect-space
      var absX = absolute(currentViewExtents[0]) + (screenX - margin.left);
      var absY = screenY - margin.top;

      for (var i = 0; i < region.rects.length; i++) {
        var rect = region.rects[i];

        if (absX >= rect.x && absX <= (rect.x + rect.width) &&
            absY >= rect.y && absY <= (rect.y + rect.height)) {
          // make sure the point is contained inside the rect
          return rect;
        }
      }

      return null;
    }

    /**
     * Draw lane lines and their labels into the offscreen lanes canvas.
     */
    function drawLanes() {
      // make sure the canvas is the correct size and clear it
      lanes.resize(timelineController.width + margin.left + margin.right);
      lanes.ctx.clearRect(0, 0, lanes.canvas.width, lanes.canvas.height);

      lanes.ctx.strokeStyle = 'lightgray';
      lanes.ctx.textBaseline = 'middle';
      lanes.ctx.font = '14px Arial';

      // draw lanes for each worker
      var laneHeight = y(1);
      for (var worker = 0; worker < timelineController.data.length; worker++) {
        var yPos = margin.top + y(worker - 0.1);

        // draw horizontal lines between lanes
        lanes.ctx.beginPath();
        lanes.ctx.moveTo(margin.left, yPos);
        lanes.ctx.lineTo(margin.left + timelineController.width, yPos);
        lanes.ctx.stroke();

        // draw labels middle-aligned to the left of each lane
        lanes.ctx.fillText(
            'Worker #' + worker,
            5, yPos + (laneHeight / 2),
            margin.left - 10);
      }
    }

    /**
     * Draw a single rect within a region. This may be called independently of
     * drawRegion() to update only a single rect, if needed.
     * @param {object}  region  the region to draw within
     * @param {object}  rect    the rect to draw
     * @param {boolean} [clear] if true, clear the rect first (default: false)
     */
    function drawSingleRect(region, rect, clear) {
      var ctx = region.c.ctx;

      if (rect.entry === selection) {
        ctx.fillStyle = statusColorMap.selected;
      } else if (rect.entry === hover) {
        ctx.fillStyle = statusColorMap.hover;
      } else {
        ctx.fillStyle = statusColorMap[rect.entry.status];
      }

      if (clear) {
        ctx.clearRect(rect.x - region.x, rect.y, rect.width, rect.height);
      }

      var filter = timelineController.filterFunction;
      if (!filter || filter(rect.entry)) {
        ctx.globalAlpha = 1.0;
      } else {
        ctx.globalAlpha = 0.15;
      }

      ctx.fillRect(rect.x - region.x, rect.y, rect.width, rect.height);
      ctx.strokeRect(rect.x - region.x, rect.y, rect.width, rect.height);
    }

    /**
     * Redraw all matching rects among all regions that contain this entry.
     * @param  {object} entry the entry to redraw
     */
    function drawAllForEntry(entry) {
      getRegionsForEntry(entry).forEach(function(region) {
        if (!region.c) {
          return;
        }

        var r = getRectForEntry(region, entry);
        if (r) {
          drawSingleRect(region, r, true);
        }
      });
    }

    /**
     * Draw the given region into its own canvas. The region will only be drawn
     * if it is marked as dirty. If its canvas has not yet been created, it will
     * be initialized automatically. Note that this does not actually draw
     * anything to the screen (i.e. main canvas), as this result only populates
     * each region's local offscreen image with content. drawAll() will actually
     * draw to the screen (and implicitly call this function as well.
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
        region.c = timelineController.createCanvas(
            region.width, height + margin.bottom);
      }

      var ctx = region.c.ctx;
      ctx.clearRect(0, 0, region.width, height);
      ctx.strokeStyle = 'rgb(175, 175, 175)';
      ctx.lineWidth = 1;

      for (var i = 0; i < region.rects.length; i++) {
        var rect = region.rects[i];
        drawSingleRect(region, rect);
      }

      // draw axis ticks + labels
      // main axis line -- offset y by 0.5 to draw crisp lines
      ctx.strokeStyle = 'lightgray';
      ctx.fillStyle = '#888';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.beginPath();
      ctx.moveTo(0, height + 0.5);
      ctx.lineTo(region.width, height + 0.5);
      ctx.stroke();

      // make a scale for the position of this region, but shrink it slightly so
      // no labels overlap region boundaries and get cut off
      var tickScale = d3.time.scale().domain([
        absolute.invert(region.x + 10),
        absolute.invert(region.x + region.width - 10)
      ]);

      // 1 tick per 125px
      var ticks = tickScale.ticks(Math.floor(region.width / 125));

      for (var tickIndex = 0; tickIndex < ticks.length; tickIndex++) {
        var tick = ticks[tickIndex];
        var tickX = Math.floor(absolute(tick) - region.x) + 0.5;

        ctx.beginPath();
        ctx.moveTo(tickX, height);
        ctx.lineTo(tickX, height + 6);
        ctx.stroke();

        ctx.fillText(tickFormat(tick), tickX, height + 7);
      }

      ctx.strokeStyle = 'rgb(175, 175, 175)';
      region.dirty = false;
    }

    function drawCursor() {
      if (!mousePoint || !mousePoint.inBounds) {
        return;
      }

      var r = main.ratio;
      var ctx = main.ctx;
      ctx.scale(main.ratio, main.ratio);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'dimgrey';
      ctx.strokeStyle = 'blue';

      // draw the cursor line
      ctx.beginPath();
      ctx.moveTo(mousePoint.x, margin.top);
      ctx.lineTo(mousePoint.x, margin.top + height);
      ctx.stroke();

      // draw the time label
      ctx.font = '9px sans-serif';
      var date = new Date(xSelected.invert(mousePoint.x - margin.left));
      ctx.fillText(cursorTimeFormat(date), mousePoint.x, 16);

      // draw the hovered item info
      if (hover) {
        var leftEdge = margin.left;
        var rightEdge = leftEdge + timelineController.width;

        ctx.font = 'bold 12px sans-serif';
        var name = hover.name.split('.').pop();
        var tw = ctx.measureText(name).width;

        var cx = mousePoint.x;
        if (mousePoint.x + (tw / 2) > rightEdge) {
          cx -= mousePoint.x - (rightEdge - tw / 2);
        } else if (mousePoint.x - (tw / 2) < leftEdge) {
          cx += (leftEdge + tw / 2) - mousePoint.x;
        }
        ctx.fillText(name, cx, 1);
      }

      // reset scale
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    /**
     * Draw all layers and visible regions on the screen.
     */
    function drawAll() {
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
            s(sx1), 0,
            Math.floor(s(sw)), s(height + margin.bottom),
            s(margin.left + region.x - startX + sx1), s(margin.top),
            s(sw), s(height + margin.bottom));
      });

      drawCursor();
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

    /**
     * Gets the canvas-local mouse point for the given mouse event, accounting
     * for all relevant offsets and margins. The returned object will include an
     * additional `inBounds` property indicating whether or not the point falls
     * within the bounds of the main canvas.
     * @param  {MouseEvent} evt the mouse event
     * @return {object}     a point object
     */
    function getMousePoint(evt) {
      var r = main.canvas.getBoundingClientRect();
      var ret = {
        xRaw: evt.clientX - r.left,
        x: evt.clientX - r.left,
        y: evt.clientY - r.top
      };

      ret.inBounds = ret.x > margin.left &&
          ret.x < (margin.left + timelineController.width) &&
          ret.y > margin.top && ret.y < (margin.top + height);

      return ret;
    }

    main.canvas.addEventListener('mousedown', function(evt) {
      evt.preventDefault();

      mousePoint = getMousePoint(evt);
      var rect = getRectAt(mousePoint.x, mousePoint.y);
      if (rect) {
        timelineController.selectItem(rect.entry);
        scope.$apply();
      }
    });

    main.canvas.addEventListener('mousemove', function(evt) {
      mousePoint = getMousePoint(evt);
      var rect = getRectAt(mousePoint.x, mousePoint.y);
      var oldHover = hover;
      if (rect && rect.entry !== hover) {
        main.canvas.style.cursor = 'pointer';
        hover = rect.entry;

        drawAllForEntry(rect.entry);
        if (oldHover) {
          drawAllForEntry(oldHover);
        }
      } else if (!rect && hover) {
        main.canvas.style.cursor = 'default';
        hover = null;
        drawAllForEntry(oldHover);
      }

      timelineController.animate();
    });

    main.canvas.addEventListener('mouseout', function(evt) {
      mousePoint = null;
      main.canvas.style.cursor = 'default';
      timelineController.animate();
    });

    scope.$on('dataLoaded', function(event, data) {
      y.domain([0, data.length]).range([0, height]);
      createRegions();
      drawLanes();

      loaded = true;
    });

    scope.$on('update', function() {
      if (!loaded) {
        return;
      }

      createRegions();
      drawLanes();
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
        // otherwise, move directly to the new location/size
        currentViewExtents = timelineController.viewExtents;
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
      } else {
        // otherwise, move directly to the new location
        currentViewExtents = timelineController.viewExtents;
      }

      timelineController.animate();
    });

    scope.$on('postSelect', function(event, newSelection) {
      var old = selection;
      if (newSelection) {
        selection = newSelection.item;
      } else {
        selection = null;
      }

      if (old) {
        drawAllForEntry(old);
      }

      if (selection) {
        drawAllForEntry(selection);
      }

      timelineController.animate();
    });

    scope.$on('filter', function() {
      if (loaded) {
        markAllDirty();
        timelineController.animate();
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
