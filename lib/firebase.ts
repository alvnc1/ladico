import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"
import { getAnalytics, type Analytics } from "firebase/analytics"

export const firebaseConfig = {
  apiKey: "AIzaSyD0nNdAafmNc4Crejel9eSl57a8tOpnsvI",
  authDomain: "ladico-d8aa2.firebaseapp.com",
  projectId: "ladico-d8aa2",
  storageBucket: "ladico-d8aa2.firebasestorage.app",
  messagingSenderId: "79757424410",
  appId: "1:79757424410:web:79247603cf5f70d9939ea3",
  measurementId: "G-2K90VT76EC"
}

let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage
let analytics: Analytics | null = null
let provider: GoogleAuthProvider

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApps()[0]!
  }

  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)

  if (typeof window !== "undefined") {
    analytics = getAnalytics(app)
  }

  provider = new GoogleAuthProvider()
  provider.setCustomParameters({
    prompt: "select_account",
  })
} catch (error) {
  console.error("❌ Error initializing Firebase services:", error)
  throw error
}

export function getFirebaseAnalytics(): Analytics | null {
  if (typeof window === "undefined") return null
  try {
    if (app && !analytics) {
      analytics = getAnalytics(app)
    }
    return analytics
  } catch (error) {
    console.error("❌ Error getting Firebase Analytics:", error)
    return null
  }
}

export { app, auth, db, storage, analytics, provider }
export default app
