// Seed ข้อมูล "คาบนิเทศ" ของครูผู้นิเทศก์ ลง Firestore collection: supervisions
// ในวัน+คาบที่ครูต้องไปนิเทศ = ไม่ว่าง = สอนแทนไม่ได้
// อ้างอิงจากตารางการนิเทศ ภาคเรียนที่ 1 ปีการศึกษา 2569 (หน้า 3-4)
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCt6sLAkyP3DOY5sfIxVF-lmJ6HajB9WQU',
  authDomain: 'class-schedule-wsk.firebaseapp.com',
  projectId: 'class-schedule-wsk',
  storageBucket: 'class-schedule-wsk.firebasestorage.app',
  messagingSenderId: '28039276366',
  appId: '1:28039276366:web:4f6785e90ebf6d0b61201f'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// teacher_name ต้องตรงกับ doc id ใน collection teachers เป๊ะ
// รูปแบบ: [ชื่อครูผู้นิเทศก์, วัน, [คาบที่ไม่ว่าง...]]
const SUPERVISIONS = [
  ['คุณครูชลณิชา หมดทุกข์', 'วันพุธ', [3, 6]],
  ['คุณครูอนุชิต กิจสาคร', 'วันพฤหัสบดี', [3, 7]],
  ['คุณครูพลอยไพลิน มีศิริ', 'วันพุธ', [7]],
  ['คุณครูพลอยไพลิน มีศิริ', 'วันศุกร์', [4]],
  ['คุณครูกัลยกร เนตรสุวรรณ', 'วันจันทร์', [2]],
  ['คุณครูกัลยกร เนตรสุวรรณ', 'วันพฤหัสบดี', [6]],
  ['คุณครูจิตสุภา คำโหงษ์', 'วันจันทร์', [1, 8]],
  ['คุณครูกฤษณะ เจี๊ยะทา', 'วันอังคาร', [6]],
  ['คุณครูกฤษณะ เจี๊ยะทา', 'วันพฤหัสบดี', [4]],
  ['คุณครูอคินธิษณ์ วิชิตะกุล', 'วันพุธ', [4, 8]],
  ['คุณครูศิรินทร์ โรจน์รัตนาภรณ์', 'วันอังคาร', [2, 3]],
  ['คุณครูเก็จมณี แสงไสยาศน์', 'วันพฤหัสบดี', [2, 6]],
  ['คุณครูศุลีพร นุชสมบูรณ์', 'วันพุธ', [5]],
  ['คุณครูศุลีพร นุชสมบูรณ์', 'วันพฤหัสบดี', [8]],
  ['คุณครูจตุพร สิงหทราเมศน์', 'วันพุธ', [2]],
  ['คุณครูจตุพร สิงหทราเมศน์', 'วันพฤหัสบดี', [2]],
  ['คุณครูอริสรา แตงนวม', 'วันจันทร์', [6]],
  ['คุณครูอริสรา แตงนวม', 'วันพฤหัสบดี', [3, 8]],
  ['คุณครูกิตติยากร ศรีธาตุ', 'วันจันทร์', [8]],
  ['คุณครูสโรชา ทัศนา', 'วันจันทร์', [1, 2]],
  ['คุณครูทรงพล ชูสวัสดิ์', 'วันพุธ', [3, 4]],
  ['คุณครูกาญจนา ป้อมทอง', 'วันจันทร์', [3]],
  ['คุณครูกาญจนา ป้อมทอง', 'วันพุธ', [4]],
  ['คุณครูเพชรพนมรุ้ง เกิดจงรักษ์', 'วันจันทร์', [3]],
  ['คุณครูเพชรพนมรุ้ง เกิดจงรักษ์', 'วันอังคาร', [1, 2, 4]],
  ['คุณครูเพชรพนมรุ้ง เกิดจงรักษ์', 'วันศุกร์', [3]]
]

async function run() {
  // ตรวจชื่อครูให้ตรงกับ teachers ก่อน
  const teacherIds = new Set((await getDocs(collection(db, 'teachers'))).docs.map(d => d.id))
  const unknown = [...new Set(SUPERVISIONS.map(s => s[0]))].filter(n => !teacherIds.has(n))
  if (unknown.length) {
    console.error('❌ ชื่อครูไม่ตรงกับ teachers:', unknown)
    process.exit(1)
  }

  // กันเขียนซ้ำ: ถ้ามีข้อมูลอยู่แล้วให้หยุด (ไม่แตะของเดิม)
  const existing = await getDocs(collection(db, 'supervisions'))
  if (existing.size > 0) {
    console.error('⚠️ collection supervisions มีข้อมูลอยู่แล้ว', existing.size, 'รายการ — ยกเลิกเพื่อกันเขียนซ้ำ')
    process.exit(1)
  }

  // เพิ่มข้อมูลนิเทศ (แตกเป็นรายคาบ)
  const batch = writeBatch(db)
  let count = 0
  for (const [name, day, periods] of SUPERVISIONS) {
    for (const p of periods) {
      const ref = doc(collection(db, 'supervisions'))
      batch.set(ref, { teacher_name: name, day_of_week: day, period: 'คาบ ' + p })
      count++
    }
  }
  await batch.commit()
  console.log('✅ เพิ่มคาบนิเทศ (ไม่ว่าง) จำนวน', count, 'รายการ')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
