'use client'
import { useState } from 'react'

interface ImageCarouselProps {
  imageUrls: string[]
  alt: string
}

export default function ImageCarousel({ imageUrls, alt }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="w-full h-full bg-stone-950 flex items-center justify-center text-stone-600 text-xs">
        ไม่มีรูปภาพประกอบ
      </div>
    )
  }

  return (
    <div className="w-full h-full relative group overflow-hidden">
      <img 
        src={imageUrls[currentIndex]} 
        alt={alt} 
        className="w-full h-full object-cover transition-all duration-500 ease-in-out" 
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
  )
}
