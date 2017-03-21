// Exposes a new method that can override purimage's draw method to draw with a 2 pixel width instead of 1
// May be necessary to ensure the lines can be easily seen against the


module.exports = doubleWidthStroke;

function doubleWidthStroke() {
  var lines = pathToLines(this.path);
  var ctx = this;
  lines.forEach(function(line){
    drawLine(ctx, line, ctx._strokeColor);
  });
}

function drawLine(image, line, color) {
  var x0 = Math.floor(line.start.x);
  var y0 = Math.floor(line.start.y);
  var x1 = Math.floor(line.end.x);
  var y1 = Math.floor(line.end.y);
  var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  var dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  var err = (dx>dy ? dx : -dy)/2;

  while (true) {
    image.compositePixel(x0,y0,color);
    // Here's where the extra drawing happens, we draw one pixel to the right and one to the bottom.
    image.compositePixel(x0 + 1, y0, color);
    image.compositePixel(x0, y0 + 1, color);
    if (x0 === x1 && y0 === y1) break;
    var e2 = err;
    if (e2 > -dx) { err -= dy; x0 += sx; }
    if (e2 < dy) { err += dx; y0 += sy; }
  }
}

function pathToLines(path) {
  var lines = [];
  var curr = null;
  path.forEach(function(cmd) {
    if(cmd[0] == 'm') {
      curr = makePoint(cmd[1],cmd[2]);
    }
    if(cmd[0] == 'l') {
      var pt = makePoint(cmd[1],cmd[2]);
      lines.push(makeLine(curr,pt));
      curr = pt;
    }
    if(cmd[0] == 'q') {
      var pts = [curr, makePoint(cmd[1],cmd[2]), makePoint(cmd[3],cmd[4])];
      for(var t=0; t<1; t+=0.1) {
        var pt = calcQuadraticAtT(pts,t);
        lines.push(makeLine(curr,pt));
        curr = pt;
      }
    }
    if(cmd[0] == 'b') {
      var pts = [curr, makePoint(cmd[1],cmd[2]), makePoint(cmd[3],cmd[4]), makePoint(cmd[5],cmd[6])];
      for(var t=0; t<1; t+=0.1) {
        var pt = calcBezierAtT(pts,t);
        lines.push(makeLine(curr,pt));
        curr = pt;
      }
    }
  });
  return lines;
}

function makePoint (x,y)       {  return {x:x, y:y} }
function makeLine  (start,end) {  return {start:start, end:end} }
