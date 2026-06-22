'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const iconHtml = `
  <div style="background-color: #eab308; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.6); transform: translate(-1px, -1px);"></div>
`

interface MapPickerProps {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Default center is Bangkok if no lat/lng is provided
    const initialLat = lat || 13.7563
    const initialLng = lng || 100.5018
    const initialZoom = lat && lng ? 15 : 6

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], initialZoom)
    mapRef.current = map

    // Add TileLayer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    // Create marker with custom div icon (to avoid asset loading issues)
    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-div-icon',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })

    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
      icon: customIcon
    }).addTo(map)
    markerRef.current = marker

    // Handle marker drag event
    marker.on('dragend', () => {
      const position = marker.getLatLng()
      onChange(position.lat, position.lng)
    })

    // Handle map click event to move marker
    map.on('click', (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng
      marker.setLatLng([clickLat, clickLng])
      onChange(clickLat, clickLng)
    })

    return () => {
      map.remove()
    }
  }, [])

  // Update map and marker if parent coordinates change (e.g. through GPS button)
  useEffect(() => {
    if (mapRef.current && markerRef.current && lat && lng) {
      const currentPos = markerRef.current.getLatLng()
      if (currentPos.lat !== lat || currentPos.lng !== lng) {
        markerRef.current.setLatLng([lat, lng])
        mapRef.current.setView([lat, lng], 15)
      }
    }
  }, [lat, lng])

  return (
    <div className="w-full rounded border border-stone-700 overflow-hidden shadow-inner">
      <div ref={mapContainerRef} className="w-full h-[250px] bg-stone-950 z-0" />
      <div className="bg-stone-900/60 p-2 text-center text-xs text-stone-400 border-t border-stone-700">
        🖱️ คลิกบนแผนที่หรือลากหมุดสีเหลืองเพื่อระบุพิกัดหมายจับปลา
      </div>
    </div>
  )
}
