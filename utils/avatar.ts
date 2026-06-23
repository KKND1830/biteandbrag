export interface AvatarInfo {
  id: string
  name: string
  description: string
  imagePath: string
  requirement: string
  checkUnlocked: (stats: {
    spotCount: number
    totalLikes: number
    maxWeight: number
    uniqueLures: number
  }) => boolean
}

export const AVATARS: AvatarInfo[] = [
  {
    id: 'basic_rod',
    name: '🎣 เบ็ดไม้ธรรมดา (Basic Rod)',
    description: 'เบ็ดไม้สุดคลาสสิกสำหรับผู้เริ่มต้นเส้นทางนักล่าปลา',
    imagePath: '/avatars/basic_rod.png',
    requirement: 'ปลดล็อกเริ่มต้นสำหรับทุกคน',
    checkUnlocked: () => true
  },
  {
    id: 'golden_compass',
    name: '🧭 เข็มทิศนักสำรวจ (Golden Compass)',
    description: 'เข็มทิศนำทางสีทองเหลืองอร่าม สำหรับผู้บุกเบิกและแบ่งปันพิกัดหมายสวย',
    imagePath: '/avatars/golden_compass.png',
    requirement: 'แนะนำหมายตกปลาสะสมตั้งแต่ 3 หมายขึ้นไป',
    checkUnlocked: (stats) => stats.spotCount >= 3
  },
  {
    id: 'golden_reel',
    name: '🏆 รอกทองคำนักล่า (Golden Popular Reel)',
    description: 'รอกทองคำสะท้อนแสงนีออน มอบให้กับนักล่าปลาขวัญใจคนทั้งบอร์ด',
    imagePath: '/avatars/golden_reel.png',
    requirement: 'ได้รับไลก์ "หมานๆ" รวมจากโพสต์ทั้งหมดตั้งแต่ 10 ไลก์ขึ้นไป',
    checkUnlocked: (stats) => stats.totalLikes >= 10
  },
  {
    id: 'heavy_lure',
    name: '🐋 เหยื่อลักกี้เฮวี่ (Heavyweight Lure)',
    description: 'เหยื่อปลอมโลหะผสมทองคำขนาดใหญ่ ออกแบบเพื่อการล่าสัตว์ร้ายขนาดยักษ์',
    imagePath: '/avatars/heavy_lure.png',
    requirement: 'เคยตกได้ปลาหนักตั้งแต่ 5.0 กก. ขึ้นไป อย่างน้อย 1 ตัว',
    checkUnlocked: (stats) => stats.maxWeight >= 5.0
  },
  {
    id: 'lure_box',
    name: '🐛 กล่องเหยื่อร้อยล้าน (Master Lure Box)',
    description: 'กล่องเหยื่อไฮเทคพร้อมไฟบอกสถานะและเหยื่อหลากหลายชนิดสำหรับมืออาชีพ',
    imagePath: '/avatars/lure_box.png',
    requirement: 'เคยใช้ชนิดเหยื่อที่แตกต่างกันในโพสต์อย่างน้อย 3 ชนิด',
    checkUnlocked: (stats) => stats.uniqueLures >= 3
  }
]

export function getAvatarPath(avatarId?: string | null): string {
  if (!avatarId) return '/avatars/basic_rod.png';
  const found = AVATARS.find(a => a.id === avatarId);
  return found ? found.imagePath : '/avatars/basic_rod.png';
}
