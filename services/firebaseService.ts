
// services/firebaseService.ts

// IMPORTACIONES DIRECTAS DESDE CDN OFICIAL (VERSION 10.13.0)
// Esto evita el error "Component auth has not been registered" al garantizar que App y Auth usan la misma instancia.
// @ts-ignore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
// @ts-ignore
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Configuración proporcionada por el usuario
const firebaseConfig = {
  apiKey: "AIzaSyAOhZN61q14wrh60GcDqL_TQ2dD4tgG6kE",
  authDomain: "neural-quiz-converter.firebaseapp.com",
  projectId: "neural-quiz-converter",
  storageBucket: "neural-quiz-converter.firebasestorage.app",
  messagingSenderId: "220946375892",
  appId: "1:220946375892:web:7864f9e8bee7c38f778741",
  measurementId: "G-EWZKN0E1FN"
};

let app;
let auth: any;
let provider: any;

try {
    // 1. Inicializar Firebase
    app = initializeApp(firebaseConfig);
    
    // 2. Inicializar Auth
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
    
    console.log("Firebase initialized successfully");
} catch (e) {
    console.error("CRITICAL: Firebase Initialization Failed", e);
}

// Exportar instancias y funciones
// NOTA: Exportamos 'onAuthStateChanged' aquí porque ya no lo importamos desde 'firebase/auth' en los componentes
export { auth, onAuthStateChanged };

// Función para iniciar sesión con Google
export const signInWithGoogle = async () => {
  if (!auth) {
      alert("Firebase no está disponible en este momento.");
      return;
  }
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error al iniciar sesión con Google:", error);
    throw error;
  }
};

// Función para cerrar sesión
export const logoutFirebase = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
};
