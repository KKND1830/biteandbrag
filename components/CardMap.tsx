'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const iconHtml = `
  <div style="background-color: #eab308; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); transform: translate(-1px, -1px);"></div>
`

interface CardMapProps {
  lat: number
  lng: number
}

export default function CardMap({ lat, lng }: CardMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      dragging: true
    }).setView([lat, lng], 14)

    // Add TileLayer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '' // Hide attribution for clean small display
    }).addTo(map)

    // Create marker with custom div icon
    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-div-icon',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    })

    L.marker([lat, lng], { icon: customIcon }).addTo(map)

    return () => {
      map.remove()
    }
  }, [lat, lng])

  return (
    <div ref={mapContainerRef} className="w-full h-full bg-stone-950 z-0" />
  )
}
