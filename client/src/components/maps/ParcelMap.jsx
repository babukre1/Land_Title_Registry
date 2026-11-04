import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import MapLegend from "./MapLegend.jsx";

const MOGADISHU = [2.0469, 45.3182];

export default function ParcelMap({ parcels, proposedGeometry, conflicts = [], className = "h-96" }) {
  const features = parcels?.features || [];
  return <div className={`overflow-hidden rounded-2xl border border-slate-200 ${className}`}><MapContainer center={MOGADISHU} zoom={13} className="h-full w-full"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{features.map((feature) => <GeoJSON key={`${feature.properties.id}-${feature.properties.status}`} data={feature} style={{ color: "#059669", weight: 2, fillOpacity: 0.15 }} />)}{proposedGeometry && <GeoJSON key={JSON.stringify(proposedGeometry)} data={proposedGeometry} style={{ color: "#2563eb", weight: 3, fillOpacity: 0.18 }} />}{conflicts.map((conflict) => <GeoJSON key={conflict.parcelId || conflict.id} data={conflict.geometry} style={{ color: "#dc2626", weight: 3, fillOpacity: 0.25 }} />)}<MapLegend /></MapContainer></div>;
}
