'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface InteractiveMapProps {
  logs: any[]
}

export default function InteractiveMap({ logs }: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // กรองเฉพาะล็อกที่มีพิกัดละติจูดและลองจิจูด
  const validLogs = logs.filter(log => log.latitude && log.longitude)

  useEffect(() => {
    if (!mapContainerRef.current) return

    // จุดกึ่งกลางเริ่มต้น (กรุงเทพฯ ประเทศไทย)
    const defaultCenter: L.LatLngExpression = [13.7563, 100.5018]
    const defaultZoom = 6

    // สร้างแผนที่ Leaflet
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      dragging: true
    })
    mapRef.current = map

    // เพิ่ม TileLayer จาก OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    // สไตล์หมุดตกปลาสีเหลืองรูปเบ็ดตกปลา
    const iconHtml = `
      <div class="flex items-center justify-center bg-yellow-500 hover:bg-yellow-400 text-stone-900 border-2 border-white rounded-full shadow-lg transition-all duration-200 hover:scale-110" style="width: 32px; height: 32px; font-size: 16px;">
        🎣
      </div>
    `
    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'interactive-map-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    })

    const markers: L.Marker[] = []

    validLogs.forEach(log => {
      const popupHtml = `
        <div class="min-w-[180px] max-w-[240px] text-stone-200">
          ${log.image_url ? `
            <div class="w-full h-24 overflow-hidden rounded-md mb-2 border border-stone-850">
              <img src="${log.image_url}" alt="${log.fish_name}" class="w-full h-full object-cover"/>
            </div>
          ` : ''}
          <h4 class="text-sm font-extrabold text-yellow-500 mb-1 flex items-center gap-1">
            ${log.fish_name?.startsWith('📍') ? log.fish_name : `🎣 ${log.fish_name || 'ไม่ระบุชื่อปลา'}`}
          </h4>
          <div class="space-y-0.5 text-xs">
            <p class="text-stone-300">👤 <b>ผู้โพสต์:</b> ${log.profiles?.display_name || log.author_name || 'นักตกปลา'}</p>
            ${log.weight ? `<p class="text-stone-300">⚖️ <b>น้ำหนัก:</b> ${log.weight} กก.</p>` : ''}
            ${log.length ? `<p class="text-stone-300">📏 <b>ความยาว:</b> ${log.length} ซม.</p>` : ''}
            ${log.lure_used ? `<p class="text-stone-300">🐛 <b>${log.fish_name?.startsWith('📍') ? 'เหยื่อแนะนำ' : 'เหยื่อ'}:</b> ${log.lure_used}</p>` : ''}
            ${log.location_name ? `<p class="text-stone-300">📍 <b>${log.fish_name?.startsWith('📍') ? 'ชื่อหมาย' : 'หมาย'}:</b> ${log.location_name}</p>` : ''}
          </div>
          <p class="text-[9px] text-stone-500 mt-2 text-right">
            ${new Date(log.created_at).toLocaleDateString('th-TH')}
          </p>
        </div>
      `

      const marker = L.marker([log.latitude, log.longitude], { icon: customIcon })
        .bindPopup(popupHtml)
        .addTo(map)
      
      markers.push(marker)
    })

    // ถ้ามีหมุด ให้ปรับซูมให้อยู่ในขอบเขตทั้งหมดของหมุด
    if (markers.length > 0) {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds().pad(0.15))
    } else {
      map.setView(defaultCenter, defaultZoom)
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [logs])

  // ปรับขนาดแผนที่และปรับ Bounds เมื่อเปิด/ปิดโหมดเต็มหน้าจอ
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize()
        const activeMarkers = validLogs.map(log => L.latLng(log.latitude, log.longitude))
        if (activeMarkers.length > 0) {
          mapRef.current.fitBounds(L.latLngBounds(activeMarkers).pad(0.15))
        }
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [isFullscreen, logs])

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-[1000] w-screen h-screen bg-stone-900 p-4 flex flex-col' : 'w-full rounded-lg overflow-hidden border border-stone-700 shadow-xl'}`}>
      
      {/* แถบควบคุมเวลาเปิดเต็มหน้าจอ */}
      {isFullscreen && (
        <div className="flex justify-between items-center mb-3 bg-stone-850 p-2.5 rounded-lg border border-stone-800">
          <span className="text-base font-black text-yellow-500 tracking-wider flex items-center gap-2">
            <span>🎣</span> แผนที่หมายตกปลาทั้งหมด
          </span>
          <button
            onClick={() => setIsFullscreen(false)}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg text-xs font-bold text-stone-200 transition-colors shadow-md cursor-pointer"
          >
            ❌ ปิดเต็มหน้าจอ
          </button>
        </div>
      )}

      {/* คอนเทนเนอร์แผนที่ Leaflet */}
      <div 
        ref={mapContainerRef} 
        className={`${isFullscreen ? 'flex-1 rounded-lg border border-stone-800' : 'w-full h-[450px]'} bg-stone-950 z-0`}
      />

      {/* ปุ่มกดดูแบบเต็มจอ (แสดงเมื่อไม่ได้เป็นโหมดเต็มจอ) */}
      {!isFullscreen && (
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute top-3 right-3 z-[400] bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold py-2 px-3.5 rounded-lg shadow-lg hover:text-white transition-colors cursor-pointer"
        >
          🖥️ ดูเต็มหน้าจอ
        </button>
      )}

      {/* แถบสรุปจำนวนหมายด้านล่าง */}
      <div className={`bg-stone-900/60 p-2.5 text-center text-xs text-stone-400 ${isFullscreen ? 'mt-3 rounded-lg border border-stone-800' : 'border-t border-stone-700'}`}>
        🗺️ ค้นพบทั้งหมด <strong className="text-yellow-500">{validLogs.length} หมาย</strong> จากผลงานทั้งหมด (คลิกที่หมุด 🎣 เพื่อดูรายละเอียด)
      </div>
    </div>
  )
}
