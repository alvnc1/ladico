import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"
import { getAnalytics, type Analytics } from "firebase/analytics"

export const firebaseConfig = {
  apiKey: "AIzaSyADgCJZhie5XzhovxDVVQ6oySlmO7ADDgA",
  authDomain: "ludicocos-e4bcc.firebaseapp.com",
  projectId: "ludicocos-e4bcc",
  storageBucket: "ludicocos-e4bcc.firebasestorage.app",
  messagingSenderId: "251212234614",
  appId: "1:251212234614:web:f52d46396a1374b66cc457",
  measurementId: "G-RT3XB7QGP0"
};


let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined
let analytics: Analytics | null = null
let storage: FirebaseStorage | undefined
let provider: GoogleAuthProvider | undefined

if (typeof window !== 'undefined') {
  try {
   
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig)
    } else {
      app = getApps()[0]
    }

    if (app) {
      auth = getAuth(app)
      db = getFirestore(app)
      storage = getStorage(app)
      analytics = getAnalytics(app)
      
      provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: "select_account",
      })
    }
  } catch (error) {
    console.error("Error initializing Firebase services:", error)
  }
}


export function getFirebaseAnalytics(): Analytics | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    if (app && !analytics) {
      analytics = getAnalytics(app)
    }
    return analytics
  } catch (error) {
    console.error("Error getting Firebase Analytics:", error)
    return null
  }
}

export { auth, db, analytics, provider }
export default app
export { storage }
