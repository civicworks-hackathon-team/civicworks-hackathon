import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from 'react-leaflet';
import { STATUS_LABELS, STATUS_COLORS } from '../utils.js';

function Recenter({ center }) {
  const map = useMap();
  const [lat, lon] = center;
  useEffect(() => { map.setView([lat, lon], map.getZoom()); }, [lat, lon, map]);
  return null;
}

export default function MapView({ center, radius, userLocation, projects, selectedId, onSelect }) {
  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom className="leaflet-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Recenter center={center} />
      <Circle center={center} radius={radius * 1000} pathOptions={{ color: '#167d6c', fillColor: '#38a58f', fillOpacity: 0.07, weight: 2, dashArray: '5 6' }} />
      {userLocation && <CircleMarker center={userLocation} radius={7} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#1459bd', fillOpacity: 1 }}><Popup><strong>You are here</strong><br />Your location is only used to center this map.</Popup></CircleMarker>}
      {projects.map(p => (
        <CircleMarker key={p.id} center={[Number(p.latitude), Number(p.longitude)]} radius={selectedId === p.id ? 10 : 7} pathOptions={{ color: '#ffffff', weight: 2, fillColor: STATUS_COLORS[p.status] || '#64748b', fillOpacity: 1 }} eventHandlers={{ click: () => onSelect(p) }}>
          <Popup><div className="map-popup"><strong>{p.title}</strong><span>{p.department}</span><span className={`status-chip status-${p.status}`}>{STATUS_LABELS[p.status]}</span><button onClick={() => onSelect(p)}>View project details →</button></div></Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
