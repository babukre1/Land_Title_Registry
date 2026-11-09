import L from "leaflet";
import "leaflet-draw";
import { useEffect, useRef } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import LocationSearchControl from "./LocationSearchControl.jsx";
import MapLegend from "./MapLegend.jsx";

const MOGADISHU = [2.0469, 45.3182];
const colors = { REGISTERED: "#059669", PENDING_SURVEY: "#2563eb", VERIFIED: "#d97706", DISPUTED: "#dc2626", RETURNED_FOR_CORRECTION: "#64748b" };

function existingParcelPopup(feature) {
  const container = document.createElement("div");
  const title = document.createElement("strong"); title.textContent = feature.properties.parcelNumber || "Existing parcel"; container.append(title);
  const status = document.createElement("p"); status.textContent = String(feature.properties.status || "").replaceAll("_", " "); container.append(status);
  const owners = feature.properties.owners || [];
  const ownership = document.createElement("p"); ownership.textContent = owners.length ? `Belongs to: ${owners.map((owner) => `${owner.name} (${owner.sharePercent}%)`).join(", ")}` : "Ownership details unavailable"; container.append(ownership);
  const notice = document.createElement("small"); notice.textContent = "Existing parcel — view only"; container.append(notice);
  return container;
}

function ExistingParcelViewport({ parcels }) {
  const map = useMap(); const fittedRef = useRef(false);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(map.getContainer());
    if (!fittedRef.current && parcels?.features?.length) {
      const bounds = L.geoJSON(parcels).getBounds(); if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 18 }); fittedRef.current = true;
    }
    return () => observer.disconnect();
  }, [map, parcels]);
  return null;
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

/** Renders existing parcels as a separate read-only layer and exposes only the proposed polygon through onChange. */
export default function ParcelDrawingMap({ value, onChange, existingParcels = { type: "FeatureCollection", features: [] } }) {
  return <div className="h-[28rem] overflow-hidden rounded-2xl border border-slate-200"><MapContainer center={MOGADISHU} zoom={14} maxZoom={22} zoomSnap={0.5} zoomDelta={0.5} className="h-full w-full" scrollWheelZoom><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxNativeZoom={19} maxZoom={22} />{existingParcels.features.map((feature) => <GeoJSON key={`existing-${feature.properties.id}-${feature.properties.status}`} data={feature} style={() => ({ color: colors[feature.properties.status] || "#64748b", weight: 2, fillOpacity: 0.2 })} onEachFeature={(item, layer) => layer.bindPopup(existingParcelPopup(item))} />)}<DrawingControls value={value} onChange={onChange} /><ExistingParcelViewport parcels={existingParcels} /><LocationSearchControl /><MapLegend /></MapContainer></div>;
}
