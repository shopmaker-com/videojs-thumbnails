(function () {
  var defaults = {
        0: {
          src: 'strip.jpg'
        }
      },
      extend = function () {
        var args, target, i, object, property;
        args = Array.prototype.slice.call(arguments);
        target = args.shift() || {};
        for (i in args) {
          object = args[i];
          for (property in object) {
            if (object.hasOwnProperty(property)) {
              if (typeof object[property] === 'object') {
                target[property] = extend(target[property], object[property]);
              } else {
                target[property] = object[property];
              }
            }
          }
        }
        return target;
      },
      getComputedStyle = function (el, pseudo) {
        return function (prop) {
          if (window.getComputedStyle) {
            return window.getComputedStyle(el, pseudo)[prop];
          } else {
            return el.currentStyle[prop];
          }
        };
      },
      offsetParent = function (el) {
        if (el.nodeName !== 'HTML' && getComputedStyle(el)('position') === 'static') {
          return offsetParent(el.offsetParent);
        }
        return el;
      },
      getScrollOffset = function () {
        if (window.pageXOffset) {
          return {
            x: window.pageXOffset,
            y: window.pageYOffset
          };
        }
        return {
          x: document.documentElement.scrollLeft,
          y: document.documentElement.scrollTop
        };
      },
      /**
       * matrix object, it will contain coordinates
       * and provide some functional
       */
      matrix = function (options) {
        var self = this;
        self.data = new Array();
        self.duration = 0; // duration of video
        self.width = 0; // width of progress bar
        self.image = ''; // path to image
        self.defaults = {
          rows: 1,
          columns: 10,
          image_height: 150,
          image_width: 200,
          last_row_count: 0, // default 0. Maybe there will be less images in last row
          seconds: 0, // display the next image all x seconds, default 0. If 0, seconds will be duration/total_count
          duration: 0
        };
        /**
         * calling create function if some options has come
         */
        if (options && typeof options == 'object') self.create(options);
      };
  /**
   * Setting functions to matrix proto
   */
  extend(matrix.prototype, {
    /**
     *Creating or rebuiding array with coordinates
     */
    create: function (options) {
      var self = this,
          data = self.data,
          config = extend({}, self.defaults, options),
          len;
      self.iheight = config.image_height;
      self.iwidth = config.image_width;
      len = config.rows * config.columns - (config.columns - config.last_row_count);
      for (var i = 1; i <= len; i++) {
        /**
         * current row and column
         */
        var row = Math.ceil(i / config.columns),
            column = i % config.columns || config.columns;

        row--;
        column--;

        data.push({
          left: column * self.iwidth,
          top: row * self.iheight
        });
      }
      if (config.seconds) {
        self.duration = config.seconds * len;
        self.seconds = config.seconds;
        self.useSeconds = true;
      }
      if (config.duration) {
        self.duration = config.duration;
        self.seconds = config.duration / len;
        self.useSeconds = false;
      }
      if (!config.image) throw new Error('Provide path to image!');
      self.image = config.image;
      self.width = config.image_width;
      self.height = config.image_height;
    },
    /**
     * Setter for duration
     * @param duration
     */
    setDuration: function (duration) {
      var self = this;
      self.duration = parseFloat(duration);
    },
    /**
     * Get style for image depending on current time
     */
    getStyleForCurrentPosition: function (time) {
      var self = this,
          style = {},
          current = self.inverse(time);
      style.backgroundPosition = '-' + current.left + 'px -' + current.top + 'px';
      return style;
    },
    /**
     * Return coordinates for current mouse position
     * @param time seconds
     * @returns {left:x,top:y}
     */
    inverse: function (time) {
      var self = this,
          data = self.data,
          len = data.length,
          duration = self.duration,
          percentage = (time % duration) / duration,
          index = Math.round(len * percentage, 2);
      return data[index];
    }
  });

  /**
   * register the thumbnails plugin
   */
  videojs.plugin('thumbnails', function (options) {
    var div, img, player, progressControl, duration, moveListener, moveCancel, mx = new matrix(options);
    player = this;

    (function () {
      var progressControl, addFakeActive, removeFakeActive;
      // Android doesn't support :active and :hover on non-anchor and non-button elements
      // so, we need to fake the :active selector for thumbnails to show up.
      if (navigator.userAgent.toLowerCase().indexOf("android") !== -1) {
        progressControl = player.controlBar.progressControl;

        addFakeActive = function () {
          progressControl.addClass('fake-active');
        };
        removeFakeActive = function () {
          progressControl.removeClass('fake-active');
        };

        progressControl.on('touchstart', addFakeActive);
        progressControl.on('touchend', removeFakeActive);
        progressControl.on('touchcancel', removeFakeActive);
      }
    })();

    // create the thumbnail
    div = document.createElement('div');
    div.className = 'vjs-thumbnail-holder';
    img = document.createElement('div');
    div.appendChild(img);
    img.className = 'vjs-thumbnail';
    img.style.background = 'url(' + mx.image + ')';
    img.style.height = mx.height + 'px';
    img.style.width = mx.width + 'px';
    img.style.left = (-mx.width / 2) + 'px';

    // keep track of the duration to calculate correct thumbnail to display
    duration = player.duration();
    if (!mx.useSeconds) mx.setDuration(duration);

    player.on('durationchange', function (event) {
      duration = player.duration();
      if (!mx.useSeconds) mx.setDuration(duration);
    });

    // add the thumbnail to the player
    progressControl = player.controlBar.progressControl;
    progressControl.el().appendChild(div);

    moveListener = function (event) {
      var mouseTime, time, active, left, style, pageX, right, width, halfWidth, pageXOffset, clientRect;
      active = 0;
      pageXOffset = getScrollOffset().x;
      clientRect = offsetParent(progressControl.el()).getBoundingClientRect();
      right = (clientRect.width || clientRect.right) + pageXOffset;

      pageX = event.pageX;
      if (event.changedTouches) {
        pageX = event.changedTouches[0].pageX;
      }

      // find the page offset of the mouse
      left = pageX || (event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft);
      // subtract the page offset of the positioned offset parent
      left -= offsetParent(progressControl.el()).getBoundingClientRect().left + pageXOffset;

      // apply updated styles to the thumbnail if necessary
      // mouseTime is the position of the mouse along the progress control bar
      // `left` applies to the mouse position relative to the player so we need
      // to remove the progress control's left offset to know the mouse position
      // relative to the progress control
      mouseTime = Math.round((left - progressControl.el().offsetLeft) / progressControl.width() * duration);
      /**
       * getting data for current time
       */
      style = mx.getStyleForCurrentPosition(mouseTime);
      img.style.backgroundPosition = style.backgroundPosition;

      width = mx.width;
      halfWidth = width / 2;

      // make sure that the thumbnail doesn't fall off the right side of the left side of the player
      if ((left + halfWidth) > right) {
        left -= (left + halfWidth) - right;
      } else if (left < halfWidth) {
        left = halfWidth;
      }

      div.style.left = left + 'px';
    };

    // update the thumbnail while hovering
    progressControl.on('mousemove', moveListener);
    progressControl.on('touchmove', moveListener);

    moveCancel = function (event) {
      div.style.left = '-1000px';
    };

    // move the placeholder out of the way when not hovering
    progressControl.on('mouseout', moveCancel);
    progressControl.on('touchcancel', moveCancel);
    progressControl.on('touchend', moveCancel);
    player.on('userinactive', moveCancel);
  });
})();
