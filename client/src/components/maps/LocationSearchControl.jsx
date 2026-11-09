import L from "leaflet";
import { MapPin, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";

const MOGADISHU = { lat: 2.0469, lon: 45.3182 };
const GEOCODING_BASE_URL = import.meta.env.VITE_GEOCODING_BASE_URL || "https://photon.komoot.io/api/";

function resultLabel(feature) {
  const properties = feature.properties || {};
  return [...new Set([
    properties.name,
    properties.street,
    properties.locality,
    properties.district,
    properties.city,
    properties.state,
    properties.country,
  ].filter(Boolean))].join(", ");
}

/**
 * Searches named locations and moves the map to a selected result.
 * Searches run only after form submission and never modify parcel geometry.
 */
export default function LocationSearchControl() {
  const map = useMap();
  const controlRef = useRef(null);
  const requestRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const container = controlRef.current;
    if (!container) return undefined;
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    return () => requestRef.current?.abort();
  }, []);

  const searchLocations = async (event) => {
    event.preventDefault();
    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
      setResults([]);
      setMessage("Enter at least 2 characters.");
      setStatus("error");
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setStatus("loading");
    setMessage("");

    try {
      const url = new URL(GEOCODING_BASE_URL);
      url.searchParams.set("q", `${searchTerm}, Somalia`);
      url.searchParams.set("limit", "5");
      url.searchParams.set("lat", String(MOGADISHU.lat));
      url.searchParams.set("lon", String(MOGADISHU.lon));
      url.searchParams.set("lang", "en");
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Location search failed (${response.status})`);
      const payload = await response.json();
      const matches = (payload.features || []).filter((feature) => feature.geometry?.type === "Point" && feature.geometry.coordinates?.length >= 2);
      setResults(matches);
      setStatus(matches.length ? "success" : "empty");
      setMessage(matches.length ? "" : "No locations found. Try a district, road, or landmark.");
    } catch (error) {
      if (error.name === "AbortError") return;
      setResults([]);
      setStatus("error");
      setMessage("Location search is temporarily unavailable.");
    }
  };

  const chooseLocation = (feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 17), { duration: 0.8 });
    setQuery(resultLabel(feature));
    setResults([]);
    setStatus("idle");
    setMessage("");
  };

  const clearSearch = () => {
    requestRef.current?.abort();
    setQuery("");
    setResults([]);
    setStatus("idle");
    setMessage("");
  };

  return (
    <div className="leaflet-top leaflet-right">
      <div ref={controlRef} className="leaflet-control m-3 w-[min(21rem,calc(100vw-7rem))] rounded-lg border border-slate-200 bg-white shadow-lg" role="search">
        <form className="flex items-center" onSubmit={searchLocations}>
          <label className="sr-only" htmlFor="map-location-search">Search map location</label>
          <Search className="ml-3 size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <input
            id="map-location-search"
            className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search district, road, or landmark"
            autoComplete="off"
          />
          {query && <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={clearSearch} aria-label="Clear location search"><X className="size-4" /></button>}
          <button type="submit" className="m-1.5 rounded-md bg-indigo-700 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-800 disabled:cursor-wait disabled:opacity-60" disabled={status === "loading"}>
            {status === "loading" ? "Searching…" : "Search"}
          </button>
        </form>

        {(results.length > 0 || message) && (
          <div className="border-t border-slate-200" aria-live="polite">
            {message && <p className={`px-3 py-2 text-xs ${status === "error" ? "text-red-700" : "text-slate-600"}`}>{message}</p>}
            {results.length > 0 && (
              <ul className="max-h-56 overflow-y-auto py-1" aria-label="Location search results">
                {results.map((feature) => {
                  const [longitude, latitude] = feature.geometry.coordinates;
                  const label = resultLabel(feature) || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
                  return (
                    <li key={`${feature.properties?.osm_type || "place"}-${feature.properties?.osm_id || `${latitude}-${longitude}`}`}>
                      <button type="button" className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50" onClick={() => chooseLocation(feature)}>
                        <MapPin className="mt-0.5 size-4 shrink-0 text-indigo-700" aria-hidden="true" />
                        <span>{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-500">Search data © OpenStreetMap contributors, powered by Photon</p>
          </div>
        )}
      </div>
    </div>
  );
}
