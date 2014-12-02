Video.js Thumbnails
===================
A plugin that allows you to configure thumbnails to display when the user is hovering over the progress bar or dragging it to seek.

[![Build Status](https://travis-ci.org/brightcove/videojs-thumbnails.svg?branch=master)](https://travis-ci.org/brightcove/videojs-thummbnails)

Difference to the original plugin
---------------------------------
This fork uses the stripe images programmatically. Instead of defining every image you want to see you just say how many images you have and the plugin calculates when to show which image.


Using the Plugin
----------------
The plugin automatically registers itself when you include video.thumbnails.js in your page:

```html
<script src='videojs.thumbnails.js'></script>
```

You probably want to include the default stylesheet, too. It handles showing and hiding thumbnails while hovering over the progress bar and a quick animation during the transition:

```html
<link href="videojs.thumbnails.css" rel="stylesheet">
```

Once you have your video created, you can activate the thumbnails plugin. In the first argument to the plugin, you should pass an object whose properties are the name of the striped image and how many images it contains (via rows and columns):

```js
video.thumbnails({
  image: 'strip.jpg',
  rows: 5,
  columns: 10,
  last_row_count: 6
});
```

Use the last_row_count param to specify how many images your last row contains. In the example above, e.g. you have 4*10+6 images. You can specify a 'seconds' parameter to display the next image all x seconds. If 0 (default), seconds will be duration of the video divided by the total count of all images.
