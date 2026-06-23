'use client'
import { useState, useEffect } from 'react'

interface ImageCarouselProps {
  imageUrls: string[]
  alt: string
}

export default function ImageCarousel({ imageUrls, alt }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  // จัดการปุ่มกดทางคีย์บอร์ดและการบล็อกการเลื่อนหน้าจอ (Body Scroll) เมื่อเปิดรูปภาพใหญ่
  useEffect(() => {
    if (!isLightboxOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false)
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => (prev - 1 + imageUrls.length) % imageUrls.length)
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => (prev + 1) % imageUrls.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // บล็อก scroll ของ body
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isLightboxOpen, imageUrls.length])

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="w-full h-full bg-stone-950 flex items-center justify-center text-stone-600 text-xs">
        ไม่มีรูปภาพประกอบ
      </div>
    )
  }

  return (
    <>
      <div className="w-full h-full relative group overflow-hidden">
        <img 
          src={imageUrls[currentIndex]} 
          alt={alt} 
          onClick={(e) => {
            e.stopPropagation()
            setIsLightboxOpen(true)
          }}
          className="w-full h-full object-cover transition-all duration-500 ease-in-out cursor-zoom-in hover:opacity-95" 
          title="คลิกเพื่อดูภาพขนาดใหญ่"
        />
        
        {imageUrls.length > 1 && (
          <>
            {/* Navigation Arrows */}
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex(prev => (prev - 1 + imageUrls.length) % imageUrls.length)
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-stone-950/70 hover:bg-stone-900 text-white rounded-full w-9 h-9 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 border border-stone-850 hover:scale-105 shadow-md"
              title="ภาพก่อนหน้า"
            >
              ◀
            </button>
            
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex(prev => (prev + 1) % imageUrls.length)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-stone-950/70 hover:bg-stone-900 text-white rounded-full w-9 h-9 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 border border-stone-850 hover:scale-105 shadow-md"
              title="ภาพถัดไป"
            >
              ▶
            </button>
            
            {/* Dot Indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-stone-950/60 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-stone-800">
              {imageUrls.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentIndex(i)
                  }}
                  className={`h-1.5 rounded-full transition-all duration-350 cursor-pointer ${
                    i === currentIndex ? 'bg-yellow-500 w-4.5' : 'bg-stone-500 hover:bg-stone-400 w-1.5'
                  }`}
                  title={`ดูภาพที่ ${i + 1}`}
                />
              ))}
            </div>

            {/* Image Count Badge */}
            <div className="absolute top-3 right-3 bg-stone-950/80 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] font-black text-stone-300 border border-stone-800">
              {currentIndex + 1} / {imageUrls.length} รูป
            </div>
          </>
        )}
      </div>

      {/* Lightbox / Fullscreen Image Overlay */}
      {isLightboxOpen && (
        <div 
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-950/95 backdrop-blur-md transition-all duration-300 animate-fadeIn"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsLightboxOpen(false)
            }}
            className="absolute top-6 right-6 text-stone-400 hover:text-white text-3xl font-light hover:scale-110 transition-all p-2 z-55 cursor-pointer bg-stone-900/50 hover:bg-stone-800/80 rounded-full w-12 h-12 flex items-center justify-center border border-stone-800 shadow-md"
            title="ปิดหน้าต่างใหญ่ (Esc)"
          >
            ✕
          </button>

          {/* Active Image Container */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-[90vw] max-h-[80vh] sm:max-h-[85vh] flex items-center justify-center select-none"
          >
            <img
              src={imageUrls[currentIndex]}
              alt={alt}
              className="max-w-full max-h-[80vh] sm:max-h-[85vh] object-contain rounded-lg shadow-2xl border border-stone-800/50 transition-all duration-300"
            />
          </div>

          {/* Lightbox Controls - Show only if > 1 image */}
          {imageUrls.length > 1 && (
            <>
              {/* Left Arrow Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex(prev => (prev - 1 + imageUrls.length) % imageUrls.length)
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 bg-stone-900/80 hover:bg-stone-800 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all cursor-pointer border border-stone-800 hover:scale-105 shadow-lg text-lg"
                title="ภาพก่อนหน้า (←)"
              >
                ◀
              </button>

              {/* Right Arrow Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex(prev => (prev + 1) % imageUrls.length)
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-stone-900/80 hover:bg-stone-800 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all cursor-pointer border border-stone-800 hover:scale-105 shadow-lg text-lg"
                title="ภาพถัดไป (→)"
              >
                ▶
              </button>

              {/* Dots / Page indicator for Lightbox */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-6 flex gap-1.5 bg-stone-900/80 backdrop-blur-sm px-3.5 py-2 rounded-full border border-stone-800"
              >
                {imageUrls.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentIndex(i)}
                    className={`h-2 rounded-full transition-all duration-350 cursor-pointer ${
                      i === currentIndex ? 'bg-yellow-500 w-6' : 'bg-stone-600 hover:bg-stone-500 w-2'
                    }`}
                    title={`ดูภาพที่ ${i + 1}`}
                  />
                ))}
              </div>

              {/* Badge for Image Count in Lightbox */}
              <div className="absolute top-6 left-6 bg-stone-900/80 backdrop-blur-sm px-3.5 py-1.5 rounded text-xs font-bold text-stone-300 border border-stone-800">
                รูปที่ {currentIndex + 1} จาก {imageUrls.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
