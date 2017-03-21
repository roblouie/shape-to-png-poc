// This PNG encode code replaces black pixels with perfectly transparent ones, we need this since we don't want a background color.

const PNG = require('pngjs').PNG;

module.exports = encodePNG;

function encodePNG (bitmap, outstream, cb) {
  var png = new PNG({
    width:bitmap.width,
    height:bitmap.height,
  });

  for(var x=0; x<bitmap.width; x++) {
    for(var y=0; y<bitmap.height; y++) {
      var idx = (png.width * y + x) << 2;
      png.data[idx] = bitmap._buffer[idx];
      png.data[idx + 1] = bitmap._buffer[idx + 1];
      png.data[idx + 2] = bitmap._buffer[idx + 2];

      if (png.data[idx] === 0 && png.data[idx+1] === 0 && png.data[idx+2] === 0) {
        png.data[idx+3] = png.data[idx+3] = 0;
      } else {
        png.data[idx + 3] = bitmap._buffer[idx + 3];
      }
    }
  }

  png.pack().pipe(outstream).on('finish', cb);
}
