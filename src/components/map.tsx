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
}: {
  issues?: Pin[];
  pick?: [number, number];
  onPick?: (lat: number, lng: number) => void;
  staff?: boolean;
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
            pathOptions={{ color: "#007f78", fillOpacity: 0.85 }}
          >
            <Popup>Selected report location</Popup>
          </CircleMarker>
        )}
        {issues.map((i) => (
          <CircleMarker
            key={i.id}
            center={[i.lat, i.lng]}
            radius={i.status === "Verified closed" ? 6 : 9}
            pathOptions={{
              color:
                i.status === "Verified closed"
                  ? "#5c8f7d"
                  : i.status === "Reopened"
                    ? "#ca7141"
                    : "#008c88",
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
