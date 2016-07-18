'use strict';

var directivesModule = require('./_index.js');

var d3Scale = require('d3-scale');

function timelineOverview($document, $window) {
  var link = function(scope, el, attrs, timelineController) {
    // local display variables
    var margin = timelineController.margin;
    var height = 80;
    var laneHeight = 10;
    var loaded = false;

    // scales and extents
    var x = timelineController.axes.x;
    var y = d3Scale.scaleLinear();
    var brushExtent = [0, 0];
    var handleSize = 3;

    // input variables
    var dragOffsetStart = null;
    var dragType = null; // left, right, position, null

    var rects = [];
    var lanes = timelineController.createCanvas(timelineController.width, height);
    var main = timelineController.createCanvas(null, height, false);
    main.canvas.unselectable = 'on';
    main.canvas.onselectstart = function() { return false; };
    main.canvas.style.userSelect = 'none';
    el.append(main.canvas);

    /**
     * Centers the viewport on a given date. If the date is not within the
     * bounds of the data, no changes are made and false is returned.
     * @param  {Date}    date the date to center on
     * @return {boolean}      true if the view was centered, false if not
     */
    function centerViewport(date) {
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

      brushExtent = [targetStart, targetEnd];
      timelineController.setViewExtents(brushExtent);
      timelineController.animate();

      return true;
    }

    /**
     * Shift the viewport left or right to fit a data rect. If the item already
     * fits inside the current view bounds, no changes are made and false is
     * returned. If not, the view will shift as much as is needed to fit the
     * item fully into view.
     * @param  {object} item the item to fit into the viewport
     * @return {boolean}     true if the view was moved, false if not
     */
    function shiftViewport(item) {
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
      var currentMid = (+viewStart) + (size / 2);
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

      brushExtent = [targetStart, targetEnd];
      timelineController.setViewExtents(brushExtent);
      timelineController.animate();

      return true;
    }

    /**
     * Creates rects from a list of data points, placing them along the primary
     * x axis and within their appropriate lanes.
     * @param  {object[]]} data a list of data points.
     * @return {object[]]}      a list of rects
     */
    function createRects(data) {
      var rects = [];

      for (var i = 0; i < data.length; i++) {
        var d = data[i];
        rects.push({
          x: x(d.startDate),
          y: y(d.worker + 0.5) - 5,
          width: x(d.endDate) - x(d.startDate),
          height: laneHeight,
          entry: d
        });
      }

      return rects;
    }

    /**
     * Draws a single rect to the off-screen lanes canvas. By default, this does
     * not clear any part of the canvas; however, if `clear` is set to `true`,
     * the area for the rect will be cleared before drawing.
     * @param  {object}  rect  the rect to draw
     * @param  {boolean} clear if true, clear the area first
     */
    function drawSingleRect(rect, clear) {
      var ctx = lanes.ctx;
      ctx.fillStyle = timelineController.statusColorMap[rect.entry.status];
      ctx.strokeStyle = 'rgb(200, 200, 200)';

      if (clear) {
        ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
      }

      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }

    /**
     * Draws all rects into the off-screen lanes canvas. This will fully clear
     * the canvas before drawing any rects. To redraw only a single rect,
     * `drawSingleRect()` can be used instead.
     */
    function drawRects() {
      lanes.resize(timelineController.width);
      lanes.ctx.clearRect(0, 0, lanes.canvas.width, lanes.canvas.height);

      for (var i = 0; i < rects.length; i++) {
        drawSingleRect(rects[i]);
      }
    }

    /**
     * Draws the brush onto the main (on-screen) canvas. The relevant canvas
     * area should already be cleared and should only contain a rendered lanes
     * image.
     */
    function drawBrush() {
      var r = main.ratio;
      var ctx = main.ctx;
      ctx.fillStyle = 'dodgerblue';
      ctx.globalAlpha = 0.365;

      var brushX = (r * margin.left) + (r * x(brushExtent[0]));
      var brushWidth = r * (x(brushExtent[1]) - x(brushExtent[0]));

      ctx.fillRect(brushX, 0, brushWidth, main.canvas.height);
      ctx.globalAlpha = 1.0;
    }

    /**
     * Draws the pre-rendered lanes image and brush onto the main canvas. This
     * is suitable for calling on every frame for a normal update, but it will
     * not update any rects in the lanes image. If this is needed, `drawRects()`
     * should be called first.
     */
    function drawAll() {
      var r = main.ratio;
      var w = timelineController.width + margin.left + margin.right;
      main.resize(w);

      main.ctx.clearRect(0, 0, main.canvas.width, main.canvas.height);
      main.ctx.drawImage(lanes.canvas, r * margin.left, 0);

      drawBrush();
    }

    timelineController.animateCallbacks.push(function() {
      drawAll();
    });

    /**
     * Gets the canvas-local mouse point for the given mouse event, accounting
     * for all relevant offsets and margins. The returned object will include an
     * additional `inBounds` property indicating whether or not the point falls
     * within the bounds of the overview canvas.
     * @param  {MouseEvent} evt the mouse event
     * @return {object}     a point object
     */
    function getMousePoint(evt) {
      var r = main.canvas.getBoundingClientRect();
      var ret = {
        xRaw: evt.clientX - r.left,
        x: evt.clientX - r.left - margin.left,
        y: evt.clientY - r.top,
        radius: evt.radiusX || (3 * main.ratio)
      };

      ret.inBounds = ret.x > 0 &&
          ret.x < timelineController.width &&
          ret.y > 0 && ret.y < height;

      return ret;
    }

    /**
     * Returns true if the given `point` falls within `size` pixels of the given
     * x coordinate. The pixel size is automatically computed from the touch
     * radius (if available) or a reasonable value, scaled based on the current
     * device pixel ratio.
     * @param  {object} point the point to check against
     * @param  {number} x     the x coordinate
     * @return {boolean}      true if the point is in bounds, false otherwise
     */
    function withinPx(point, x) {
      return point.inBounds && Math.abs(x - point.x) <= point.radius;
    }

    /**
     * Flips the given drag type string: "left" becomes "right" and "right"
     * becomes "left". The input string is returned if it isn't either "left"
     * or "right".
     * @param  {string} side the drag type string to flip
     * @return {string}      the opposite value, or the input if invalid
     */
    function flip(side) {
      if (side === 'left') {
        return 'right';
      } else if (side === 'right') {
        return 'left';
      } else {
        return side;
      }
    }

    /**
     * Returns the closest matching extent satisfying the desired left and right
     * pixel values within the timeline's overall time extents. If the given
     * type is "position", this will attempt to preserve the size of the extent
     * by adjusting the opposite value to fit when an edge is reached;
     * otherwise, the extent may have one value capped at the timeline's minium
     * or maximum edges. The returned object will contain the resulting drag
     * type (as it may have been flipped) as well as the computed valid extents
     * in an array.
     *
     * Note that order of the left and right parameters does not technically
     * matter, as they will be flipped automatically if necessary.
     * @param  {number} desiredLeft  the preferred left end of the extent
     * @param  {number} desiredRight the preferred right end of the extent
     * @param  {string} type         the drag type, e.g. "left" or "position"
     * @return {object}              an object with the new drag type and the
     *                               computed extents array
     */
    function smartExtent(desiredLeft, desiredRight, type) {
      desiredLeft = x.invert(desiredLeft);
      desiredRight = x.invert(desiredRight);
      if (desiredLeft > desiredRight) {
        type = flip(type);
      }
      var l = Math.min(desiredLeft, desiredRight);
      var r = Math.max(desiredLeft, desiredRight);

      if (type === 'position') {
        // plain translation, don't allow size to change if possible
        var size = r - l;
        if (l < timelineController.timeExtents[0]) {
          l = +timelineController.timeExtents[0];
          r = Math.min(+timelineController.timeExtents[1], l + size);
        } else if (r > timelineController.timeExtents[1]) {
          r = +timelineController.timeExtents[1];
          l = Math.max(+timelineController.timeExtents[0], r - size);
        }
      } else {
        // cap at left and right time extents
        if (l < timelineController.timeExtents[0]) {
          l = timelineController.timeExtents[0];
        }

        if (r > timelineController.timeExtents[1]) {
          r = timelineController.timeExtents[1];
        }
      }

      return { extent: [l, r], type: type };
    }

    /**
     * Handles a mouse press on the canvas at the given point. If the point is
     * within range of a handle (either left or right), it will begin a drag
     * operation for that side. If the click is otherwise within the existing
     * selection, a position drag will be started. Otherwise, the click will
     * start a new selection at the current position with a left drag.
     *
     * Note that this function should only be called for element-level events,
     * and not window-level events.
     * @param  {object} p the mouse point
     */
    function handleMouseDown(p) {
      var brushLeft = x(brushExtent[0]);
      var brushRight = x(brushExtent[1]);

      if (withinPx(p, brushLeft)) {
        dragType = 'left';
      } else if (withinPx(p, brushRight)) {
        dragType = 'right';
      } else if (p.x > brushLeft && p.x < brushRight) {
        dragType = 'position';
        dragOffsetStart = p.x - brushLeft;
      } else {
        // start a new selection
        brushExtent = [x.invert(p.x), x.invert(p.x)];
        dragType = 'left';
        timelineController.animate();
      }
    }

    /**
     * Handles a mouse move at the given point. If a drag is in progress, this
     * will perform the necessary resizing of the brush and start an animate
     * task. If no drag is in process, the mouse cursor will be updated as
     * necessary.
     *
     * Note that this function should be used to handle all mouse events at the
     * window level so that dragging doesn't need to occur strictly in bounds
     * of the canvas element. In most browsers, window-level events will even
     * allow the drag to continue when the mouse leaves the browser window
     * entirely.
     * @param  {object} p the mouse point
     * @return {boolean}  true if the triggering event's preventDefault() should
     *                    be called, false otherwise
     */
    function handleMouseMove(p) {
      var brushLeft = x(brushExtent[0]);
      var brushRight = x(brushExtent[1]);
      var e;

      if (dragType !== null) {
        // handle the drag
        if (dragType === 'left') {
          e = smartExtent(p.x, brushRight, dragType);
          dragType = e.type;
          brushExtent = e.extent;
        } else if (dragType === 'right') {
          e = smartExtent(brushLeft, p.x, dragType);
          dragType = e.type;
          brushExtent = e.extent;
        } else {
          var size = brushRight - brushLeft;
          var left = p.x - dragOffsetStart;

          brushExtent = smartExtent(left, left + size, dragType).extent;
        }

        timelineController.setViewExtents(brushExtent);
        timelineController.animate();
        return false;
      } else {
        // just update the cursor as needed - show drag arrows over left & right
        // brush edges
        if (withinPx(p, brushLeft)) {
          main.canvas.style.cursor = 'ew-resize';
        } else if (withinPx(p, brushRight)) {
          main.canvas.style.cursor = 'ew-resize';
        } else if (p.inBounds && p.x > brushLeft && p.x < brushRight) {
          main.canvas.style.cursor = 'move';
        } else {
          main.canvas.style.cursor = 'default';
        }
      }

      return true;
    }

    /**
     * Handles a mouse up event.
     *
     * This should handle all events at the window level so that drags that
     * don't complete strictly within the window are ended properly. Most
     * browsers will allow window-level mouseup events to trigger for drags even
     * if the cursor is outside of the window entirely.
     */
    function handleMouseUp() {
      dragType = null;
      dragOffsetStart = null;
      main.canvas.style.cursor = 'default';
    }

    main.canvas.addEventListener('mousedown', function(evt) {
      // listen on the actual element so we only get element events
      evt.preventDefault();
      handleMouseDown(getMousePoint(evt));
    });

    main.canvas.addEventListener('touchstart', function(evt) {
      evt.preventDefault();
      for (var i = 0; i < evt.changedTouches.length; i++) {
        var touch = evt.changedTouches[i];
        handleMouseDown(getMousePoint(touch));
      }
    });

    $window.addEventListener('mousemove', function(evt) {
      // listen on the window - this lets us get drag events for the whole page
      // and (depending on browser) even outside of the window
      if (!handleMouseMove(getMousePoint(evt))) {
        evt.preventDefault();
      }
    });

    $window.addEventListener('touchmove', function(evt) {
      for (var i = 0; i < evt.changedTouches.length; i++) {
        var touch = evt.changedTouches[i];
        if (!handleMouseMove(getMousePoint(touch))) {
          evt.preventDefault();
          return;
        }
      }
    });

    $window.addEventListener('mouseup', handleMouseUp);
    $window.addEventListener('touchend', handleMouseUp);
    $window.addEventListener('touchcancel', handleMouseUp);

    scope.$on('dataLoaded', function(event, data) {
      laneHeight = height / (data.length + 1);
      y.domain([0, data.length]).range([0, height]);
      rects = createRects(timelineController.dataRaw);

      var timeExtents = timelineController.timeExtents;
      var start = timeExtents[0];
      var end = timeExtents[1];
      var reducedEnd = new Date(start.getTime() + (end - start) / 8);

      brushExtent = [start, reducedEnd];
      timelineController.setViewExtents(brushExtent);

      loaded = true;

      drawRects();
    });

    scope.$on('update', function() {
      rects = createRects(timelineController.dataRaw);
      drawRects();
      timelineController.animate();
    });

    scope.$on('updateView', function() {
      brushExtent = timelineController.viewExtents;
      timelineController.animate();
    });

    scope.$on('select', function(event, selection) {
      if (selection) {
        shiftViewport(selection.item);
      }
    });

    scope.$on('filter', function() {
      if (loaded) {
        drawRects();
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
