export default function MapLegend() {
  return <div className="leaflet-bottom leaflet-left"><div className="leaflet-control rounded-lg bg-white p-3 text-xs shadow"><p className="mb-2 font-bold text-slate-800">Map legend</p><div className="space-y-1.5"><p><span className="mr-2 inline-block size-3 rounded-sm bg-emerald-500" />Registered or protected parcel</p><p><span className="mr-2 inline-block size-3 rounded-sm bg-blue-500" />Proposed parcel</p><p><span className="mr-2 inline-block size-3 rounded-sm bg-red-500" />Conflicting parcel</p></div></div></div>;
}
