import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCt6sLAkyP3DOY5sfIxVF-lmJ6HajB9WQU",
  authDomain: "class-schedule-wsk.firebaseapp.com",
  projectId: "class-schedule-wsk",
  storageBucket: "class-schedule-wsk.firebasestorage.app",
  messagingSenderId: "28039276366",
  appId: "1:28039276366:web:4f6785e90ebf6d0b61201f",
  measurementId: "G-W4MNJZZ6WB"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
