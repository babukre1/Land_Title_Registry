import L from "leaflet";
import "leaflet-draw";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import MapLegend from "./MapLegend.jsx";

const MOGADISHU = [2.0469, 45.3182];

// Leaflet Draw closes a polygon when the newest point is double-clicked. Fast
// point placement on touch-capable laptops can trigger that accidentally after
// three sides, so closing is limited to the first point or the Finish button.
function requireExplicitPolygonFinish(handler) {
  handler._updateFinishHandler = function updateFinishHandler() {
    if (this._markers.length === 1) {
      this._markers[0].on("click", this._finishShape, this);
    }
  };

  // Leaflet Draw also auto-finishes near the first point whenever the browser
  // reports touch support. Many Windows laptops report touch support even when
  // the user is drawing with a mouse, so normal clicks must always add a vertex.
  handler._endPoint = function addPointUntilExplicitFinish(clientX, clientY, event) {
    if (this._mouseDownOrigin) {
      const clickDistance = L.point(clientX, clientY).distanceTo(this._mouseDownOrigin);
      if (clickDistance < 9 * (window.devicePixelRatio || 1)) {
        this.addVertex(event.latlng);
      }
      this._enableNewMarkers();
    }
    this._mouseDownOrigin = null;
  };
}

function DrawingControls({ value, onChange }) {
  const map = useMap(); const groupRef = useRef(null); const changeRef = useRef(onChange);
  useEffect(() => { changeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    const group = new L.FeatureGroup(); groupRef.current = group; map.addLayer(group);
    const control = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          maxPoints: 100,
          // Once the third corner is placed Leaflet renders a filled SVG shape.
          // It must not capture mouse events or later clicks never reach the
          // invisible drawing marker that adds the fourth and later corners.
          shapeOptions: { interactive: false, clickable: false },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: { featureGroup: group, remove: true },
    });
    map.addControl(control);
    const polygonHandler = control._toolbars?.draw?._modes?.polygon?.handler;
    if (polygonHandler) requireExplicitPolygonFinish(polygonHandler);
    const emit = () => { let geometry = null; group.eachLayer((layer) => { geometry = layer.toGeoJSON().geometry; }); changeRef.current(geometry); };
    const created = (event) => { group.clearLayers(); group.addLayer(event.layer); emit(); };
    map.on(L.Draw.Event.CREATED, created); map.on(L.Draw.Event.EDITED, emit); map.on(L.Draw.Event.DELETED, emit);
    return () => { map.off(L.Draw.Event.CREATED, created); map.off(L.Draw.Event.EDITED, emit); map.off(L.Draw.Event.DELETED, emit); map.removeControl(control); map.removeLayer(group); };
  }, [map]);
  useEffect(() => {
    const group = groupRef.current; if (!group) return;
    group.clearLayers();
    if (value) L.geoJSON(value).eachLayer((layer) => group.addLayer(layer));
  }, [value]);
  return null;
}

export default function ParcelDrawingMap({ value, onChange }) {
  return <div className="h-[28rem] overflow-hidden rounded-2xl border border-slate-200"><MapContainer center={MOGADISHU} zoom={14} className="h-full w-full"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><DrawingControls value={value} onChange={onChange} /><MapLegend /></MapContainer></div>;
}
