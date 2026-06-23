'use client'

import { useEffect, useRef, useState } from 'react'
import { getUserLevelInfo } from '../utils/level'
import { parseImageUrls } from '../utils/image'

interface ShareCardModalProps {
  log: any
  catchCount: number
  onClose: () => void
}

export default function ShareCardModal({ log, catchCount, onClose }: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [downloadUrl, setDownloadUrl] = useState<string>('')
  const [imageError, setImageError] = useState(false)
  const [mapError, setMapError] = useState(false)
  
  const totalPoints = log.profiles?.total_points || 0
  const lvlInfo = getUserLevelInfo(catchCount, totalPoints)
  const hasCoords = log.latitude !== null && log.longitude !== null && log.latitude !== undefined && log.longitude !== undefined
  const isSpot = log.fish_name?.startsWith('📍')
  const imageUrls = parseImageUrls(log.image_url)
  const displayImageUrl = imageUrls.length > 0 ? imageUrls[0] : null

  useEffect(() => {
    const drawCard = async () => {
      setLoading(true)
      const canvas = canvasRef.current
      if (!canvas) return
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // --- 1. เคลียร์แคนวาสและวาดพื้นหลังไล่โทนสี ---
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height)
      bgGrad.addColorStop(0, '#1c1917') // stone-900
      bgGrad.addColorStop(0.5, '#0c0a09') // stone-950
      bgGrad.addColorStop(1, '#020202') // pure black
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // ลวดลายแสงพื้นหลัง
      const radialGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 50,
        canvas.width / 2, canvas.height / 2, 400
      )
      radialGrad.addColorStop(0, `${lvlInfo.colorHex}15`)
      radialGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = radialGrad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // --- 2. วาดขอบกรอบหลักตามเลเวล ---
      ctx.lineWidth = 10
      ctx.strokeStyle = lvlInfo.colorHex
      
      ctx.shadowColor = lvlInfo.glowColor
      ctx.shadowBlur = 15
      ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10)
      
      ctx.shadowBlur = 0
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#292524' // stone-800
      ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24)

      // --- 3. ส่วนหัว (Header): Bite & Brag โลโก้ ---
      ctx.fillStyle = '#a8a29e' // stone-400
      ctx.font = 'bold 13px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(isSpot ? '🗺️ BITE & BRAG SPOT 🗺️' : '🎣 BITE & BRAG RECORD 🎣', canvas.width / 2, 45)

      // --- 4. การจัดการพิกัดแบ่ง 2 ช่อง (รูปปลา + แผนที่) ---
      const frameY = 70
      const frameH = 340
      
      let fishX = 40
      let fishW = 520
      
      let mapX = 0
      let mapW = 0

      if (hasCoords) {
        fishW = 250
        mapX = 310
        mapW = 250
      }

      // 4.1 วาดรูปภาพถ่ายปลา
      const drawFishImage = async () => {
        const drawPlaceholder = (text: string) => {
          ctx.save()
          const placeGrad = ctx.createLinearGradient(fishX, frameY, fishX + fishW, frameY + frameH)
          placeGrad.addColorStop(0, '#292524')
          placeGrad.addColorStop(1, '#1c1917')
          ctx.fillStyle = placeGrad
          ctx.fillRect(fishX, frameY, fishW, frameH)

          ctx.lineWidth = 1.5
          ctx.strokeStyle = `${lvlInfo.colorHex}50`
          ctx.strokeRect(fishX, frameY, fishW, frameH)

          ctx.fillStyle = '#44403c'
          ctx.font = hasCoords ? '40px Arial' : '60px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('🐟', fishX + fishW / 2, frameY + frameH / 2 - 10)

          ctx.fillStyle = '#78716c'
          ctx.font = 'bold 11px Arial, sans-serif'
          ctx.fillText(text, fishX + fishW / 2, frameY + frameH / 2 + 25)
          ctx.restore()
        }

        if (displayImageUrl) {
          try {
            await new Promise<void>((resolve) => {
              const img = new Image()
              
              // ตั้งระบบดักจับ Timeout 2.5 วินาที
              const timeoutId = setTimeout(() => {
                console.warn('Image load timed out')
                setImageError(true)
                drawPlaceholder('โหลดภาพปลาไม่สำเร็จ (หมดเวลาเชื่อมต่อ)')
                resolve()
              }, 2500)

              img.crossOrigin = 'anonymous'
              img.onload = () => {
                clearTimeout(timeoutId)
                try {
                  ctx.save()
                  // คลิปขอบเขตเพื่อไม่ให้รูปภาพล้นกรอบ
                  ctx.beginPath()
                  ctx.rect(fishX, frameY, fishW, frameH)
                  ctx.clip()

                  // คำนวณขยายรูปแบบครอบพอดี (Object-cover)
                  const imgRatio = img.width / img.height
                  const targetRatio = fishW / frameH
                  let baseScale = 1
                  
                  if (imgRatio > targetRatio) {
                    baseScale = frameH / img.height
                  } else {
                    baseScale = fishW / img.width
                  }

                  const drawW = img.width * baseScale
                  const drawH = img.height * baseScale

                  // กึ่งกลางภาพพอดี
                  const drawX = fishX + (fishW - drawW) / 2
                  const drawY = frameY + (frameH - drawH) / 2

                  ctx.drawImage(img, drawX, drawY, drawW, drawH)
                  ctx.restore()

                  // วาดขอบรอบรูปปลา
                  ctx.lineWidth = 2
                  ctx.strokeStyle = lvlInfo.colorHex
                  ctx.strokeRect(fishX, frameY, fishW, frameH)
                } catch (e) {
                  console.error('Error drawing image on canvas:', e)
                  setImageError(true)
                  drawPlaceholder('ภาพถ่ายปลา (ไม่สามารถเรนเดอร์ได้)')
                }
                resolve()
              }
              img.onerror = () => {
                clearTimeout(timeoutId)
                console.warn('Image load error:', displayImageUrl)
                setImageError(true)
                drawPlaceholder('ภาพถ่ายปลา (ติดปัญหา CORS รูปภาพ)')
                resolve()
              }
              // ใช้ Timestamp ป้องกันปัญหา Cache CORS ของเบราว์เซอร์
              img.src = `${displayImageUrl}${displayImageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
            })
          } catch (e) {
            drawPlaceholder('ภาพถ่ายปลา (ไม่สามารถโหลดได้)')
          }
        } else {
          drawPlaceholder('ไม่ได้แนบรูปภาพผลงาน')
        }
      }

      // วาดแผนที่สำรองกรณีไทล์โหลดไม่ได้หรือติด CORS
      const drawMapPlaceholder = (text: string) => {
        ctx.save()
        const placeGrad = ctx.createLinearGradient(mapX, frameY, mapX + mapW, frameY + frameH)
        placeGrad.addColorStop(0, '#292524')
        placeGrad.addColorStop(1, '#1c1917')
        ctx.fillStyle = placeGrad
        ctx.fillRect(mapX, frameY, mapW, frameH)

        ctx.lineWidth = 1.5
        ctx.strokeStyle = `${lvlInfo.colorHex}50`
        ctx.strokeRect(mapX, frameY, mapW, frameH)

        ctx.fillStyle = '#44403c'
        ctx.font = '40px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('📍', mapX + mapW / 2, frameY + frameH / 2 - 20)

        ctx.fillStyle = '#e7e5e4'
        ctx.font = 'bold 12px Arial, sans-serif'
        ctx.fillText(log.location_name || 'หมายตกปลา', mapX + mapW / 2, frameY + frameH / 2 + 15)

        ctx.fillStyle = '#78716c'
        ctx.font = '10px Arial, sans-serif'
        ctx.fillText(`พิกัด: ${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)}`, mapX + mapW / 2, frameY + frameH / 2 + 35)

        ctx.fillStyle = '#57534e'
        ctx.font = '9px Arial, sans-serif'
        ctx.fillText(text, mapX + mapW / 2, frameY + frameH / 2 + 55)
        ctx.restore()
      }

      // 4.2 วาดแผนที่จาก Yandex Static Maps (โหลดรูปเดียว รวดเร็ว และรองรับ CORS สมบูรณ์)
      const drawOSMMap = async () => {
        if (!hasCoords) return
        
        const lat = log.latitude
        const lng = log.longitude
        const mapZoom = 14
        
        // Yandex Static Maps URL (longitude มาก่อน latitude, พร้อมวางจุดปักมาร์กเกอร์สีเหลืองเรืองแสงตรงกลาง)
        const mapUrl = `https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&z=${mapZoom}&size=${mapW},${frameH}&l=map&pt=${lng},${lat},pm2ywm`

        try {
          await new Promise<void>((resolve) => {
            const mapImg = new Image()
            const timeoutId = setTimeout(() => {
              console.warn('Map load timed out')
              setMapError(true)
              drawMapPlaceholder('แผนที่ (หมดเวลาเชื่อมต่อ)')
              resolve()
            }, 2500)

            mapImg.crossOrigin = 'anonymous'
            mapImg.onload = () => {
              clearTimeout(timeoutId)
              try {
                ctx.save()
                ctx.beginPath()
                ctx.rect(mapX, frameY, mapW, frameH)
                ctx.clip()
                ctx.drawImage(mapImg, mapX, frameY, mapW, frameH)
                ctx.restore()

                // วาดเส้นขอบแผนที่
                ctx.lineWidth = 2
                ctx.strokeStyle = lvlInfo.colorHex
                ctx.strokeRect(mapX, frameY, mapW, frameH)
              } catch (e) {
                console.error('Error drawing map image:', e)
                setMapError(true)
                drawMapPlaceholder('แผนที่ (เรนเดอร์ล้มเหลว)')
              }
              resolve()
            }
            mapImg.onerror = () => {
              clearTimeout(timeoutId)
              console.warn('Map image load error')
              setMapError(true)
              drawMapPlaceholder('แผนที่ (ไม่สามารถดาวน์โหลดได้)')
              resolve()
            }
            mapImg.src = mapUrl
          })
        } catch (e) {
          drawMapPlaceholder('แผนที่ (โหลดขัดข้อง)')
        }
      }

      // วาดภาพปลาและแผนที่คู่กัน
      await Promise.all([drawFishImage(), drawOSMMap()])

      // --- 5. วาดคำโปรยฟีลลิ่ง DOTA (Main Catchphrase) ---
      const phraseY = 460
      ctx.textAlign = 'center'
      
      ctx.shadowColor = lvlInfo.glowColor
      ctx.shadowBlur = 18
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 36px Arial, sans-serif'
      ctx.fillText(isSpot ? '📍 BEAUTIFUL SPOT FOUND! 🗺️' : lvlInfo.phrase, canvas.width / 2, phraseY)
      ctx.shadowBlur = 0 
      ctx.shadowBlur = 0 

      // --- 6. แสดงข้อมูลเลเวล (Badge) ---
      const badgeY = 505
      const badgeText = `[LV.${lvlInfo.level}] ${lvlInfo.title}`
      ctx.font = 'bold 15px Arial, sans-serif'
      const textWidth = ctx.measureText(badgeText).width
      
      const pillW = textWidth + 24
      const pillH = 28
      const pillX = (canvas.width - pillW) / 2
      
      ctx.fillStyle = '#1c1917' 
      ctx.beginPath()
      ctx.roundRect(pillX, badgeY - 20, pillW, pillH, 14)
      ctx.fill()
      
      ctx.lineWidth = 1.5
      ctx.strokeStyle = lvlInfo.colorHex
      ctx.beginPath()
      ctx.roundRect(pillX, badgeY - 20, pillW, pillH, 14)
      ctx.stroke()

      ctx.fillStyle = lvlInfo.colorHex
      ctx.fillText(badgeText, canvas.width / 2, badgeY)

      // นามแฝงผู้โพสต์
      ctx.fillStyle = '#e7e5e4' 
      ctx.font = 'bold 18px Arial, sans-serif'
      const authorName = log.profiles?.display_name || log.author_name || 'นักตกปลาลึกลับ'
      ctx.fillText(`คุณ ${authorName}`, canvas.width / 2, 545)

      // --- 7. ตารางข้อมูลรายละเอียดผลงาน ---
      const tableY = 580
      ctx.lineWidth = 1
      ctx.strokeStyle = '#292524' 
      
      ctx.beginPath()
      ctx.moveTo(60, tableY)
      ctx.lineTo(canvas.width - 60, tableY)
      ctx.stroke()

      const drawTableCell = (title: string, value: string, x: number, y: number, align: 'left' | 'right' = 'left') => {
        ctx.textAlign = align
        ctx.fillStyle = '#78716c' 
        ctx.font = '11px Arial, sans-serif'
        ctx.fillText(title, x, y)
        
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 14px Arial, sans-serif'
        ctx.fillText(value, x, y + 18)
      }

      const col1 = 70
      const col2 = 330
      
      if (isSpot) {
        drawTableCell('ประเภทโพสต์', 'แนะนำหมายตกปลา 🗺️', col1, tableY + 20)
        drawTableCell('ชื่อหมายตกปลา', log.location_name || '-', col2, tableY + 20)

        drawTableCell('ละติจูด (Latitude)', log.latitude !== null && log.latitude !== undefined ? log.latitude.toFixed(6) : '-', col1, tableY + 68)
        drawTableCell('ลองจิจูด (Longitude)', log.longitude !== null && log.longitude !== undefined ? log.longitude.toFixed(6) : '-', col2, tableY + 68)

        drawTableCell('เหยื่อแนะนำ', log.lure_used || '-', col1, tableY + 116)
        drawTableCell('วันที่แนะนำหมาย', new Date(log.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }), col2, tableY + 116)
      } else {
        drawTableCell('ชนิดปลา', log.fish_name || '-', col1, tableY + 20)
        drawTableCell('สถานที่ตกปลา', log.location_name || '-', col2, tableY + 20)

        drawTableCell('น้ำหนักตัวปลา', log.weight ? `${log.weight} กิโลกรัม` : '-', col1, tableY + 68)
        drawTableCell('ความยาวตัวปลา', log.length ? `${log.length} เซนติเมตร` : '-', col2, tableY + 68)

        drawTableCell('เหยื่อที่ใช้หลอกล่อ', log.lure_used || '-', col1, tableY + 116)
        drawTableCell('วันที่บันทึกผลงาน', new Date(log.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }), col2, tableY + 116)
      }

      // --- 8. เส้นปิดท้ายตารางและข้อมูลท้ายรูป ---
      const tableBottomY = tableY + 155
      ctx.beginPath()
      ctx.moveTo(60, tableBottomY)
      ctx.lineTo(canvas.width - 60, tableBottomY)
      ctx.stroke()

      ctx.textAlign = 'center'
      ctx.fillStyle = '#57534e' 
      ctx.font = '11px Arial, sans-serif'
      if (totalPoints > 0) {
        ctx.fillText(`คะแนนการแข่งขันสะสม: ${totalPoints} แต้ม 🏆`, canvas.width / 2, tableBottomY + 20)
      } else {
        ctx.fillText(`สะสมแต้มผลงานเพื่อเพิ่มระดับพลังของคุณได้ที่นี่`, canvas.width / 2, tableBottomY + 20)
      }

      ctx.fillStyle = lvlInfo.colorHex
      ctx.font = 'bold 12px Arial, sans-serif'
      ctx.fillText('biteandbrag.vercel.app 🎣', canvas.width / 2, canvas.height - 35)

      // บันทึก URL สำหรับดาวน์โหลด
      try {
        const url = canvas.toDataURL('image/png')
        setDownloadUrl(url)
      } catch (err) {
        console.error('Error generating download url:', err)
      }
      
      setLoading(false)
    }

    drawCard()
  }, [
    log.id,
    displayImageUrl,
    log.fish_name,
    log.location_name,
    log.weight,
    log.length,
    log.latitude,
    log.longitude,
    log.created_at,
    catchCount,
    totalPoints,
    hasCoords
  ])

  const handleDownload = () => {
    if (!downloadUrl) return
    const link = document.createElement('a')
    const fileName = `bite_and_brag_${log.fish_name || 'fish'}_${Date.now()}.png`
    link.download = fileName
    link.href = downloadUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-850 rounded-xl max-w-md w-full p-6 shadow-2xl relative flex flex-col items-center my-8">
        {/* ปุ่มปิด */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white transition-colors bg-stone-800 hover:bg-stone-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
          title="ปิดหน้าจอ"
        >
          ✕
        </button>

        <h2 className="text-lg font-black text-white mb-1 flex items-center gap-1.5 self-start">
          <span>🎣</span> แชร์ผลงาน ขิง
        </h2>
        <p className="text-xs text-stone-400 mb-5 self-start">
          เซฟรูปการ์ดแชร์ เพื่อนำไปขิงกับเพื่อนๆ ในโซเชียลได้เลยครับ
        </p>

        {/* พื้นที่สำหรับ Render Canvas */}
        <div className="relative w-full max-w-[300px] aspect-[3/4] bg-stone-950 rounded-lg overflow-hidden border border-stone-800 shadow-xl mb-6">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950/90 text-stone-300 z-10">
              <span className="text-3xl animate-bounce mb-2">🎣</span>
              <p className="text-xs animate-pulse text-stone-400 text-center px-4">กำลังถักทอรูปภาพและแผนที่ลงบนการ์ด...</p>
            </div>
          )}
          
          <canvas
            ref={canvasRef}
            width={600}
            height={800}
            className="w-full h-full object-contain"
          />
        </div>

        {/* กล่องเตือนกรณีโหลดภาพติด CORS */}
        {(imageError || mapError) && (
          <div className="mb-6 p-2.5 bg-yellow-950/40 border border-yellow-900/30 rounded text-[10.5px] text-yellow-300 w-full text-center leading-normal">
            ⚠️ พบข้อจำกัดสิทธิ์รูปภาพหรือแผนที่ จึงใช้วาดรูปตัวแทนบางส่วนลงในการ์ด เพื่อความเสถียรในการดาวน์โหลด
          </div>
        )}

        <div className="flex gap-3 w-full">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white text-sm font-bold rounded-lg transition-colors border border-stone-700"
          >
            ย้อนกลับ
          </button>
          <button 
            onClick={handleDownload}
            disabled={loading || !downloadUrl}
            className={`flex-[2] py-3 text-stone-950 text-sm font-black rounded-lg transition-all shadow-lg flex items-center justify-center gap-1.5 ${
              loading || !downloadUrl 
                ? 'bg-stone-700 text-stone-500 cursor-not-allowed' 
                : 'bg-yellow-500 hover:bg-yellow-400 active:scale-98'
            }`}
          >
            <span>📥</span> เซฟรูปการ์ดแชร์ (PNG)
          </button>
        </div>
      </div>
    </div>
  )
}
