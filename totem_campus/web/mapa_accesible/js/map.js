const MAP_CONFIG = {
  center: [-71.5958, -33.0345],
  zoom: 16.5,
  pitch: 55,
  bearing: -25
};

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors'
      }
    },
    layers: [
      {
        id: 'osm-tiles',
        type: 'raster',
        source: 'osm',
        minzoom: 0,
        maxzoom: 20
      }
    ]
  },
  ...MAP_CONFIG
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');

map.on('load', async () => {
  const response = await fetch('./data/buildings.geojson');
  const buildingsData = await response.json();

  map.addSource('buildings', {
    type: 'geojson',
    data: buildingsData
  });

  map.addLayer({
    id: 'buildings-3d',
    type: 'fill-extrusion',
    source: 'buildings',
    paint: {
      'fill-extrusion-color': ['coalesce', ['get', 'color'], '#2563eb'],
      'fill-extrusion-height': ['coalesce', ['get', 'height'], 10],
      'fill-extrusion-base': ['coalesce', ['get', 'base_height'], 0],
      'fill-extrusion-opacity': 0.9
    }
  });

  map.on('mouseenter', 'buildings-3d', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'buildings-3d', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'buildings-3d', (e) => {
    const feature = e.features?.[0];
    if (!feature) return;

    const { name, category, floors, description } = feature.properties;
    new maplibregl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`
        <div>
          <strong>${name ?? 'Sin nombre'}</strong><br />
          <small>Categoría: ${category ?? '-'} · Pisos: ${floors ?? '-'}</small>
          <p style="margin: 6px 0 0;">${description ?? ''}</p>
        </div>
      `)
      .addTo(map);
  });
});