const shapefile = require("shapefile");

module.exports = convertAndFilterShapefileToGeoJson;

// reads the shape and dbf file and converts it into geoJson.
// Accepts a station WFO and what warnings to include to filter down the nation wide shape file to just the station
// and warnings we care about.

function convertAndFilterShapefileToGeoJson(stationWFO, warningsToInclude) {
  // This code is pretty sketchy due to the ugly nested / recursive promise pattern the shapefile module uses, but it works.
  const promise = new Promise(function(resolve, reject) {
    const geoJson = [];
    shapefile.open("current_hazards.shp", "current_hazards.dbf")
        .then(source => source.read()
            .then(function log(result) {

              // If done, resolve with the result
              if (result.done) {
                resolve(geoJson);
              } else {
                // Otherwise keep building the geoJson, FILTERING by who the WFO is and what warnings should be included
                if (result.value.properties.WFO === stationWFO && warningsToInclude.includes(result.value.properties.MSG_TYPE)) {
                  geoJson.push(result.value);
                }
                return source.read().then(log);
              }
            }))
        .catch(error => reject(error.stack));
  });

  return promise;
}

