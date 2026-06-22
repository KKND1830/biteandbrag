import Link from 'next/link'

export const metadata = {
  title: 'นโยบายความเป็นส่วนตัว - Bite & Brag 🎣',
  description: 'นโยบายความเป็นส่วนตัวและข้อกำหนดการลบข้อมูลผู้ใช้งาน สำหรับแอพพลิเคชัน Bite & Brag',
}

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-stone-900 text-stone-200 py-16 px-6 sm:px-12 flex justify-center">
      <div className="max-w-3xl w-full bg-stone-850 p-8 sm:p-12 rounded-xl shadow-2xl border border-stone-800">
        
        <div className="mb-8 border-b border-stone-800 pb-6 flex justify-between items-center">
          <h1 className="text-3xl font-black text-yellow-500 tracking-wider">
            🎣 Bite & Brag
          </h1>
          <Link href="/" className="text-stone-400 hover:text-white text-sm font-bold transition-colors">
            ⬅️ กลับหน้าหลัก
          </Link>
        </div>

        <div className="space-y-8 leading-relaxed">
          {/* Thai Version */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white border-l-4 border-yellow-500 pl-3">
              นโยบายความเป็นส่วนตัว (Privacy Policy)
            </h2>
            <p className="text-sm text-stone-400">อัปเดตล่าสุด: 22 มิถุนายน 2569</p>
            
            <p className="text-sm">
              แอพพลิเคชัน <strong>Bite & Brag</strong> ให้ความสำคัญกับความเป็นส่วนตัวของผู้ใช้งานเป็นอันดับแรก เราจัดทำนโยบายความเป็นส่วนตัวฉบับนี้เพื่ออธิบายเกี่ยวกับการจัดเก็บข้อมูล การใช้งาน และการลบข้อมูลผู้ใช้เมื่อเข้าสู่ระบบด้วย Facebook Login หรือ Google Login
            </p>

            <div className="space-y-3 mt-4 text-sm">
              <h3 className="font-bold text-stone-300">1. ข้อมูลที่เราจัดเก็บ</h3>
              <p>เราจัดเก็บข้อมูลเฉพาะที่จำเป็นเพื่อใช้ในการยืนยันตัวตนและการเข้าสู่ระบบเท่านั้น ได้แก่:</p>
              <ul className="list-disc pl-5 space-y-1 text-stone-300">
                <li>อีเมล (Email address)</li>
                <li>ชื่อและรูปโปรไฟล์สาธารณะ (Public Profile Name & Photo)</li>
              </ul>

              <h3 className="font-bold text-stone-300">2. การนำข้อมูลไปใช้งาน</h3>
              <p>เราใช้ข้อมูลดังกล่าวเพื่อวัตถุประสงค์ต่อไปนี้เท่านั้น:</p>
              <ul className="list-disc pl-5 space-y-1 text-stone-300">
                <li>เพื่อสร้างบัญชีผู้ใช้งานบนระบบของเรา</li>
                <li>เพื่อแสดงชื่อเล่น/นามแฝง (Display Name) ของผู้โพสต์บนการ์ดผลงานตกปลา</li>
              </ul>

              <h3 className="font-bold text-stone-300">3. คำแนะนำการลบข้อมูลผู้ใช้ (Data Deletion Instructions)</h3>
              <p>
                ผู้ใช้สามารถขอให้ลบข้อมูลส่วนบุคคลที่แอพพลิเคชันจัดเก็บไว้ได้ทุกเมื่อ โดยทำตามขั้นตอนดังนี้:
              </p>
              <ol className="list-decimal pl-5 space-y-1.5 text-stone-300">
                <li>ส่งอีเมลแจ้งความประสงค์ขอเกี่ยวกับการลบข้อมูลมายัง <strong>maybekeng@gmail.com</strong></li>
                <li>โปรดระบุหัวข้ออีเมลว่า "ขอการลบข้อมูลผู้ใช้ Bite & Brag" พร้อมแนบอีเมลของบัญชีที่ใช้งาน</li>
                <li>เราจะดำเนินการลบข้อมูลผู้ใช้งานและข้อมูลบันทึกผลงานทั้งหมดออกจากฐานข้อมูลของเราภายใน 24 ชั่วโมง และจะส่งอีเมลยืนยันผลการดำเนินการให้คุณทราบ</li>
              </ol>
            </div>
          </section>

          <hr className="border-stone-800 my-8" />

          {/* English Version */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white border-l-4 border-yellow-500 pl-3">
              Privacy Policy & Data Deletion Instructions
            </h2>
            <p className="text-sm text-stone-400">Last updated: June 22, 2026</p>

            <p className="text-sm">
              At <strong>Bite & Brag</strong>, we respect your privacy. This policy describes how we collect, use, and process your personal data when using our application via Facebook Login or Google Login.
            </p>

            <div className="space-y-3 mt-4 text-sm text-stone-300">
              <h3 className="font-bold text-white">1. Data We Collect</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Email address</li>
                <li>Name and public profile picture</li>
              </ul>

              <h3 className="font-bold text-white">2. How We Use Your Data</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>To authenticate users and manage user accounts.</li>
                <li>To display the author's name on their uploaded fishing catch cards.</li>
              </ul>

              <h3 className="font-bold text-white">3. User Data Deletion Instructions</h3>
              <p>
                If you want to delete your activities and personal data associated with Bite & Brag, you can request data deletion by following these steps:
              </p>
              <ol className="list-decimal pl-5 space-y-1.5">
                <li>Send an email request to <strong>maybekeng@gmail.com</strong>.</li>
                <li>Subject the email as "Bite & Brag User Data Deletion Request" and provide the email address used for registration.</li>
                <li>We will permanently delete your account profile and all corresponding catch records from our databases within 24 hours, and send you a confirmation email.</li>
              </ol>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-stone-800 text-center text-xs text-stone-500">
          biteandbrag.vercel.app &copy; 2026 | All rights reserved.
        </div>
      </div>
    </main>
  )
}
