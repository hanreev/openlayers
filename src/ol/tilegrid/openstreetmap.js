goog.provide('ol.tilegrid.createOpenStreetMap');

goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');
goog.require('ol.Projection');
goog.require('ol.TileGrid');


/**
 * @param {number} maxZoom Maximum zoom.
 * @return {ol.TileGrid} Tile grid.
 */
ol.tilegrid.createOpenStreetMap = function(maxZoom) {

  var resolutions = new Array(maxZoom + 1);
  var z;
  for (z = 0; z <= maxZoom; ++z) {
    resolutions[z] = ol.Projection.EPSG_3857_HALF_SIZE / (128 << z);
  }

  var extent = ol.Projection.EPSG_3857_EXTENT;
  var origin = new goog.math.Coordinate(
      -ol.Projection.EPSG_3857_HALF_SIZE, ol.Projection.EPSG_3857_HALF_SIZE);
  var tileSize = new goog.math.Size(256, 256);

  return new ol.TileGrid(resolutions, extent, origin, tileSize);

};
