import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAd-8WYrtjo2771X1-qFMQr-MJdCTZJ_Gs",
  authDomain: "bizacq-bizacq.firebaseapp.com",
  projectId: "bizacq-bizacq",
  storageBucket: "bizacq-bizacq.firebasestorage.app",
  messagingSenderId: "262919472044",
  appId: "1:262919472044:web:cc2cc1de3a53456e153009",
  measurementId: "G-3TLE8NJ421"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code !== 'auth/popup-closed-by-user') {
      console.error("Error signing in with Google:", error);
    }
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};
