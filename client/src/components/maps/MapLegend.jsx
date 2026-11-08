const rows = [["bg-emerald-600", "Registered"], ["bg-blue-600", "Pending survey or proposed"], ["bg-amber-600", "Verified"], ["bg-red-600", "Disputed or conflicting"], ["bg-slate-500", "Returned or other"]];
export default function MapLegend() {
  return <div className="leaflet-bottom leaflet-left"><div className="leaflet-control rounded-lg bg-white p-3 text-xs shadow" role="note" aria-label="Map status legend"><p className="mb-2 font-bold text-slate-800">Map legend</p><div className="space-y-1.5">{rows.map(([color, label]) => <p key={label}><span className={`mr-2 inline-block size-3 rounded-sm ${color}`} aria-hidden="true" />{label}</p>)}</div></div></div>;
}
