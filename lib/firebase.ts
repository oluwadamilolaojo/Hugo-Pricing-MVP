// lib/firebase.ts
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
}

// Lazy initialization — only runs in the browser, never during SSR/build
let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _provider: GoogleAuthProvider | null = null

function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  }
  return _app
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp())
  }
  return _auth
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!_provider) {
    _provider = new GoogleAuthProvider()
    _provider.setCustomParameters({ hd: 'hugotech.co' })
  }
  return _provider
}

// Keep these exports for backward compatibility
export const auth = typeof window !== 'undefined' ? getFirebaseAuth() : null as unknown as Auth
export const googleProvider = typeof window !== 'undefined' ? getGoogleProvider() : null as unknown as GoogleAuthProvider
