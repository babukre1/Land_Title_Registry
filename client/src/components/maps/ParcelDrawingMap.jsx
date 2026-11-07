import L from "leaflet";
import "leaflet-draw";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import MapLegend from "./MapLegend.jsx";

const MOGADISHU = [2.0469, 45.3182];

function DrawingControls({ value, onChange }) {
  const map = useMap(); const groupRef = useRef(null); const changeRef = useRef(onChange);
  useEffect(() => { changeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    const group = new L.FeatureGroup(); groupRef.current = group; map.addLayer(group);
    const control = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          // leaflet-draw 1.0.4 throws from its live area formatter in strict
          // mode, leaving the mouse marker disabled after a vertex is added.
          showArea: false,
          // An open SVG path is visually filled as soon as it has three points.
          // That fill can cover Leaflet Draw's invisible mouse marker and turn
          // later clicks into map drags. Keep only the outline while drawing;
          // the completed polygon is filled in the CREATED handler below.
          shapeOptions: { fill: false, interactive: false },
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
    const emit = () => { let geometry = null; group.eachLayer((layer) => { geometry = layer.toGeoJSON().geometry; }); changeRef.current(geometry); };
    const created = (event) => { event.layer.setStyle({ fill: true, fillOpacity: 0.2 }); group.clearLayers(); group.addLayer(event.layer); emit(); };
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
