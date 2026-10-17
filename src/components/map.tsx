"use client";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
type Pin = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  status: string;
  location?: string;
  synthetic?: boolean;
};
function Picker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}
export default function CityMap({
  issues = [],
  pick,
  onPick,
  staff = false,
  onSelect,
  selectedId,
}: {
  issues?: Pin[];
  pick?: [number, number];
  onPick?: (lat: number, lng: number) => void;
  staff?: boolean;
  onSelect?: (id: string) => void;
  selectedId?: string;
}) {
  return (
    <div className="map-box">
      <MapContainer
        center={pick || [50.9097, -1.4044]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onPick && <Picker onPick={onPick} />}{" "}
        {pick && (
          <CircleMarker
            center={pick}
            radius={10}
            pathOptions={{ color: "#2563eb", fillOpacity: 0.85 }}
          >
            <Popup>Selected report location</Popup>
          </CircleMarker>
        )}
        {issues.map((i) => (
          <CircleMarker
            key={i.id}
            center={[i.lat, i.lng]}
            radius={
              selectedId === i.id ? 12 : i.status === "Verified closed" ? 6 : 8
            }
            eventHandlers={
              onSelect ? { click: () => onSelect(i.id) } : undefined
            }
            pathOptions={{
              color:
                i.status === "Verified closed"
                  ? "#0f766e"
                  : i.status === "Reopened"
                    ? "#d97706"
                    : "#2563eb",
              weight: 3,
              fillColor: "#fff",
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <strong>{i.title}</strong>
              <p>
                {i.location} · {i.status}
              </p>
              {i.synthetic && <small>DEMO DATA</small>}
              {staff && (
                <p>
                  <Link href={`/dashboard/issues/${i.id}`}>Open issue →</Link>
                </p>
              )}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="map-key">
        <span className="dot" />
        Southampton ·{" "}
        {onPick
          ? "Click map to select location"
          : `${issues.length} issues shown`}
      </div>
    </div>
  );
}
