/**
 * Migration script: Supabase → Firestore
 * ใช้ Firebase Client SDK — ไม่ต้องการ Service Account Key
 *
 * วิธีใช้:
 * 1. ไปที่ Firebase Console → Firestore → Rules
 *    วางกฎนี้ชั่วคราว แล้วกด Publish:
 *      rules_version = '2';
 *      service cloud.firestore {
 *        match /databases/{database}/documents {
 *          match /{document=**} { allow read, write: if true; }
 *        }
 *      }
 * 2. รัน: node migrate_to_firestore.js
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore'
import { createClient } from '@supabase/supabase-js'

// ─── Firebase (Client SDK) ────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCt6sLAkyP3DOY5sfIxVF-lmJ6HajB9WQU",
  authDomain: "class-schedule-wsk.firebaseapp.com",
  projectId: "class-schedule-wsk",
  storageBucket: "class-schedule-wsk.firebasestorage.app",
  messagingSenderId: "28039276366",
  appId: "1:28039276366:web:4f6785e90ebf6d0b61201f"
}
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ─── Supabase (read-only) ─────────────────────────────────────────────────────
const supabase = createClient(
  'https://qhpuclassinuslchioju.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFocHVjbGFzc2ludXNsY2hpb2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjI1OTcsImV4cCI6MjA5NzEzODU5N30.3PRG2EqYT9WMZQCcnV-fzHV4DljJftYEZSzYbTQnwjQ'
)

// ─── Batch write helper (max 500 ops/batch) ───────────────────────────────────
async function batchWrite(collectionName, docs, getDocId = null) {
  const CHUNK = 400
  for (let i = 0; i < docs.length; i += CHUNK) {
    const chunk = docs.slice(i, i + CHUNK)
    const batch = writeBatch(db)
    chunk.forEach(data => {
      const ref = getDocId
        ? doc(db, collectionName, getDocId(data))
        : doc(collection(db, collectionName))
      batch.set(ref, data)
    })
    await batch.commit()
    process.stdout.write(`\r  ✓ ${collectionName}: ${Math.min(i + CHUNK, docs.length)}/${docs.length}`)
  }
  process.stdout.write('\n')
}

async function migrate() {
  console.log('\n🔄 เริ่มย้ายข้อมูล Supabase → Firestore\n')

  // ── teachers ──────────────────────────────────────────────────────────────
  console.log('📦 teachers...')
  const { data: teachers, error: te } = await supabase.from('teachers').select('*').order('name')
  if (te) throw te
  // ใช้ teacher name เป็น document ID เพื่อให้ update ด้วย atomic increment ได้
  await batchWrite('teachers', teachers, t => t.name)
  console.log(`✅ teachers: ${teachers.length} รายการ\n`)

  // ── schedules ─────────────────────────────────────────────────────────────
  console.log('📦 schedules...')
  const { data: schedules, error: se } = await supabase.from('schedules').select('*')
  if (se) throw se
  await batchWrite('schedules', schedules)
  console.log(`✅ schedules: ${schedules.length} รายการ\n`)

  // ── duties ────────────────────────────────────────────────────────────────
  console.log('📦 duties...')
  const { data: duties, error: de } = await supabase.from('duties').select('*')
  if (de) throw de
  await batchWrite('duties', duties)
  console.log(`✅ duties: ${duties.length} รายการ\n`)

  // ── substitutions ─────────────────────────────────────────────────────────
  console.log('📦 substitutions...')
  const { data: subs, error: sse } = await supabase.from('substitutions').select('*')
  if (sse) throw sse
  await batchWrite('substitutions', subs)
  console.log(`✅ substitutions: ${subs.length} รายการ\n`)

  console.log('🎉 Migration สำเร็จ! ข้อมูลทั้งหมดอยู่ใน Firestore แล้ว')
}

migrate().catch(err => {
  console.error('\n❌ Migration ล้มเหลว:', err.message || err)
  process.exit(1)
})
