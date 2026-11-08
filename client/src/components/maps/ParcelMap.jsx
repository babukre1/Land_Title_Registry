import L from "leaflet";
import { useEffect } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import MapLegend from "./MapLegend.jsx";

const MOGADISHU = [2.0469, 45.3182];
const colors = { REGISTERED: "#059669", PENDING_SURVEY: "#2563eb", VERIFIED: "#d97706", DISPUTED: "#dc2626", RETURNED_FOR_CORRECTION: "#64748b" };
const styleFor = (status) => ({ color: colors[status] || "#64748b", weight: 3, fillOpacity: 0.18 });

function MapViewport({ data }) {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(map.getContainer());
    const geometry = L.geoJSON(data); const bounds = geometry.getBounds(); if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
    return () => observer.disconnect();
  }, [map, data]);
  return null;
}

export default function ParcelMap({ parcels, proposedGeometry, conflicts = [], className = "h-96" }) {
  const features = parcels?.features || [];
  const viewportData = { type: "FeatureCollection", features: [...features, ...(proposedGeometry ? [{ type: "Feature", geometry: proposedGeometry, properties: {} }] : []), ...conflicts.filter((item) => item.geometry).map((item) => ({ type: "Feature", geometry: item.geometry, properties: {} }))] };
  return <div className={`overflow-hidden rounded-2xl border border-slate-200 ${className}`}><MapContainer center={MOGADISHU} zoom={13} className="h-full w-full" scrollWheelZoom><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{features.map((feature) => <GeoJSON key={`${feature.properties.id}-${feature.properties.status}`} data={feature} style={() => styleFor(feature.properties.status)} onEachFeature={(item, layer) => layer.bindPopup(`<strong>${item.properties.parcelNumber || "Parcel"}</strong><br>${String(item.properties.status || "").replaceAll("_", " ")}<br>${String(item.properties.landUse || "").replaceAll("_", " ")}`)} />)}{proposedGeometry && <GeoJSON key={JSON.stringify(proposedGeometry)} data={proposedGeometry} style={{ color: "#2563eb", weight: 3, dashArray: "7 5", fillOpacity: 0.18 }} />}{conflicts.filter((item) => item.geometry).map((conflict) => <GeoJSON key={conflict.parcelId || conflict.id} data={conflict.geometry} style={{ color: "#dc2626", weight: 4, fillOpacity: 0.25 }} onEachFeature={(_, layer) => layer.bindPopup(`<strong>${conflict.parcelNumber || "Conflicting parcel"}</strong><br>Conflict or dispute`)} />)}<MapViewport data={viewportData} /><MapLegend /></MapContainer></div>;
}
