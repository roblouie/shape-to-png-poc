const pImage = require('pureimage');
const fs = require('fs');

const doubleWidthStroke = require('./pureimage-draw-update');
const encodePNG = require('./draw-transparent-png');
const convertAndFilterShapefileToGeoJson = require('./shape-file-convert-filter');

// In the real app this should check if it's KMPX, and should pass MSG_TYPE codes for thunderstorm, flash flood, and tornado warnings.
// Here it filters to KIWX as the station, and warnings of small craft advisory and lake effect snow, since those were available at time of POC.
convertAndFilterShapefileToGeoJson('KIWX', ['MWW', 'WSW'])
    .then(drawPolygon);


function drawPolygon(data) {
  var img1 = pImage.make(200, 200, {fillval: '0x000000FF'});
  var c2 = img1.getContext('2d');

  // In the real app, these would be the colors for the warnings we care about, green for flash flood, yellow for thunderstorm, red for tornado.
  // Again none of those were available for the POC, so instead we have red for lake effect and green for small craft for the POC
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
    c2.strokeStyle = item.properties.MSG_TYPE === 'WSW' ? lakeEffectSnowColor : smallCraftAdvisoryColor;

    c2.stroke = doubleWidthStroke;


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
    c2.stroke();
  });


  // Writes the png image with our custom encodePNG, which replaces black pixels with fully transparent ones.
  encodePNG(img1, fs.createWriteStream('out.png'), function(err) {
    console.log("wrote out the png file to out.png");
  });
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
