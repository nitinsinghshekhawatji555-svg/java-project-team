'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { AlertCircle, User, HardHat } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Re-anchor a high-visibility crimson marker icon for live vehicle incident flags
const incidentMarkerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  shadowSize: [41, 41]
})

export default function LiveIncidentsMap({ requests }) {
  const defaultCenter = [5.6037, -0.1870] // Centered on Accra Grid loops

  return (
    <div className="w-full h-72 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative z-10">
      <MapContainer center={defaultCenter} zoom={11} maxZoom={19} minZoom={3} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        {requests?.map((req) => {
          if (!req.incident_lat || !req.incident_lng) return null

          return (
            <Marker 
              key={req.id} 
              position={[Number(req.incident_lat), Number(req.incident_lng)]}
              icon={incidentMarkerIcon}
            >
              <Popup>
                <div className="p-1 min-w-[180px] font-sans text-slate-900">
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded mb-1.5">
                    <AlertCircle size={10} /> Dispatch Status: {req.status}
                  </span>
                  <h4 className="font-black text-xs text-slate-900 capitalize m-0">{req.problem_description || 'Vehicle breakdown'}</h4>
                  
                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600 font-medium">
                    <p className="flex items-center gap-1"><User size={11} /> Driver: {req.driver?.full_name || 'Anonymous'}</p>
                    <p className="flex items-center gap-1">
                      <HardHat size={11} /> Mechanic: <span className={req.mechanic?.full_name ? 'text-slate-900 font-bold' : 'text-amber-600 italic'}>{req.mechanic?.full_name || 'Awaiting assignment'}</span>
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}