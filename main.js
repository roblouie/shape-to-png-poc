const pImage = require('pureimage');
const PNG = require('pngjs').PNG;
const shapefile = require("shapefile");
const fs = require('fs');


getDataAndDrawPolygon();


// reads the shape and dbf file and converts it into geoJson, then once complete calls drawPolygon
// This code is pretty sketchy due to the ugly nested / recursive promise patter the shapefile module uses, but it works.
function getDataAndDrawPolygon() {
  const geoJson = [];
  shapefile.open("current_hazards.shp", "current_hazards.dbf")
    .then(source => source.read()
      .then(function log(result) {

        // If done, pass the geoJson to the drawPolygon method
        if (result.done) {
          drawPolygon(geoJson);
        } else {
          // Otherwise keep building the geoJson, FILTERING by who the WFO is. The real WFO will be KMPX, but when I wrote this there were no warnings in Minnesota.
          // We'd also want to filter by result.properties.MSG_TYPE, filtering to only flash flood, thunderstorm, and tornado messages.
          if (isStationWeCareAbout(result.value.properties.WFO) && isSmallCraftOrLakeEffect(result.value.properties)) {
            geoJson.push(result.value);
          }
          return source.read().then(log);
        }
      }))
    .catch(error => console.error(error.stack));
}

// In the real app this should check if it's KMPX
function isStationWeCareAbout(wfo) {
  return wfo === 'KIWX';
}

// Filters to message type codes that match the warning type, in this case small craft advisory and lake effect snow, since those were available at time of POC.
function isSmallCraftOrLakeEffect(properties) {
  return properties.MSG_TYPE === 'MWW' || properties.MSG_TYPE === 'WSW';
}

function drawPolygon(data) {
  // Set overall transparency here, we don't want it per-polygon, as we want them to fully over-draw each other, with red on top, then yellow, then green.
  var img1 = pImage.make(200, 200, {fillval: '0x00000066'});
  var c2 = img1.getContext('2d');

  // In the real app, these would be the colors for the warnings we care about, green for flash flood, yellow for thunderstorm, red for tornado.
  // Again none of those were available for the POC, so instead
  const lakeEffectSnowColor = 'rgba(255, 0, 0, 1.0)';
  const smallCraftAdvisoryColor = 'rgba(0, 255, 0, 1.0)';

  // In the real app, we'll need to sort the data with flash floods first, then thunderstorms second, then tornadoes third. That way as the polygons
  // are drawn, the more important warnings will be drawn on top of the less important ones.

  data.forEach(item => {
    // Bounding box and scaling are just for POC, in the real app we need to use the same orthographic projection used for the other shape files.
    var bbox = getBoundingBox(data);
    var xScale = 200 / Math.abs(bbox.xMax - bbox.xMin);
    var yScale = 200 / Math.abs(bbox.yMax - bbox.yMin);
    var scale = xScale < yScale ? xScale : yScale;

    // Here I set the color based on the warning type.
    c2.fillStyle = item.properties.MSG_TYPE === 'WSW' ? lakeEffectSnowColor : smallCraftAdvisoryColor;


    // Now we start a path, loop through all the coordinate, apply the scaling, then draw to each point. After the loop
    // we close the path and fill it.
    c2.beginPath();

    for (var i = 0; i < item.geometry.coordinates[0].length; i ++) {
      let coords = data[0].geometry.coordinates[0][i];
      let x = (coords[0] - bbox.xMin) * scale;
      let y = (bbox.yMax - coords[1]) * scale;

      if (i === 0) {
        c2.moveTo(x, y);
      } else {
        c2.lineTo(x, y);
      }
    }

    c2.closePath();
    c2.fill();
  });


  // Writes the png image with our custom encodePNG, which replaces black pixels with fully transparent ones.
  encodePNG(img1, fs.createWriteStream('out.png'), function(err) {
    console.log("wrote out the png file to out.png");
  });
}


// This PNG encode code replaces black pixels with perfectly transparent ones, we need this since we don't want a background color.
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



// Not applicable to the real application, instead we'd use the orthographic projection used in the app.
function getBoundingBox (data) {
  var bounds = {}, coords, point, latitude, longitude;

  // Loop through each “feature”
  for (var i = 0; i < data.length; i++) {

    // Pull out the coordinates of this feature
    coords = data[i].geometry.coordinates[0];

    // For each individual coordinate in this feature's coordinates…
    for (var j = 0; j < coords.length; j++) {

      longitude = coords[j][0];
      latitude = coords[j][1];

      // Update the bounds recursively by comparing the current
      // xMin/xMax and yMin/yMax with the coordinate
      // we're currently checking
      bounds.xMin = bounds.xMin < longitude ? bounds.xMin : longitude;
      bounds.xMax = bounds.xMax > longitude ? bounds.xMax : longitude;
      bounds.yMin = bounds.yMin < latitude ? bounds.yMin : latitude;
      bounds.yMax = bounds.yMax > latitude ? bounds.yMax : latitude;
    }

  }

  // Returns an object that contains the bounds of this GeoJSON
  // data. The keys of this object describe a box formed by the
  // northwest (xMin, yMin) and southeast (xMax, yMax) coordinates.
  return bounds;
}
