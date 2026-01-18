
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { Quiz } from "../types";

// --- 1. CONFIGURACIÓN DEL PROYECTO 'UNA-PARA-TODAS' ---
const firebaseConfig = { 
  apiKey: "AIzaSyCAhcayYuNdENYbAF-ezITwZA5EeVnbcZ0", 
  authDomain: "una-para-todas.firebaseapp.com", 
  projectId: "una-para-todas", 
  storageBucket: "una-para-todas.firebasestorage.app", 
  messagingSenderId: "1005385021667", 
  appId: "1:1005385021667:web:b0c13438ab526d29bcadd6", 
  measurementId: "G-M5VDERWPRJ" 
};

// --- 2. INICIALIZACIÓN ---
const app = initializeApp(firebaseConfig);

// Inicializar Analytics solo si estamos en un entorno de navegador
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export const db = getFirestore(app);
export const auth = getAuth(app);

// --- 3. CONFIGURACIÓN CRÍTICA DEL PROVEEDOR (SCOPES) ---
export const googleProvider = new GoogleAuthProvider();

// Scopes necesarios para la exportación a Google Slides
googleProvider.addScope('https://www.googleapis.com/auth/presentations');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// Exportamos onAuthStateChanged para uso en componentes
export { onAuthStateChanged };

console.log("🔥 Firebase (NPM) 'una-para-todas' inicializado correctamente con Scopes de Slides/Drive.");

// --- 4. FUNCIONES DE AUTENTICACIÓN ---

export const signInWithGoogle = async (): Promise<{ user: any, token: string | null }> => {
  try {
    // Usamos el provider configurado arriba
    const result = await signInWithPopup(auth, googleProvider);
    
    // Recuperar el Access Token de Google (CRUCIAL para las APIs de Google Slides)
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;
    
    if (!token) {
        console.warn("⚠️ Login exitoso pero no se recibió Access Token. La exportación a Slides podría fallar.");
    }
    
    return { user: result.user, token };
  } catch (error) {
    console.error("Error al iniciar sesión con Google:", error);
    throw error;
  }
};

export const logoutFirebase = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
};

// --- 5. FUNCIONES DE GESTIÓN DE DATOS (FIRESTORE) ---

/**
 * Guardar o Actualizar un Quiz
 */
export const saveQuizToFirestore = async (quiz: Quiz, userId: string, asCopy: boolean = false): Promise<string> => {
    // Verificación de usuario
    const currentUser = auth.currentUser;
    const effectiveUid = currentUser?.uid || userId;

    if (!effectiveUid) {
        console.error("CRITICAL SAVE ERROR: No User ID available.");
        alert("Error crítico: No se puede guardar sin un usuario autenticado.");
        throw new Error("User ID is undefined or null");
    }

    const collectionRef = collection(db, "quizes");
    
    // Construimos el objeto base
    const rawData = {
        userId: effectiveUid,
        title: quiz.title || "Untitled Quiz",
        description: quiz.description || "",
        questions: quiz.questions || [],
        tags: quiz.tags || []
    };

    // Limpieza de 'undefined' para Firestore
    let cleanData: any;
    try {
        cleanData = JSON.parse(JSON.stringify(rawData));
    } catch (e) {
        console.error("Error al limpiar datos JSON:", e);
        throw new Error("Failed to sanitize quiz data");
    }

    try {
        if (quiz.id && !asCopy) {
            // --- UPDATE FLOW ---
            const payload = {
                ...cleanData,
                updatedAt: serverTimestamp()
            };

            const docRef = doc(db, "quizes", quiz.id);
            await updateDoc(docRef, payload);
            return quiz.id;

        } else {
            // --- CREATE FLOW ---
            if (asCopy) {
                cleanData.title = `${cleanData.title} (Copy)`;
            }
            
            const payload = { 
                ...cleanData, 
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp() 
            };

            const docRef = await addDoc(collectionRef, payload);
            return docRef.id;
        }
    } catch (e: any) {
        console.error("🔥 Error al guardar en Firestore (una-para-todas).");
        console.error(">> Datos:", cleanData); 
        console.error(">> Error:", e);
        throw e;
    }
};

/**
 * Obtener Quizzes del Usuario con Fallback de Índice
 */
export const getUserQuizzes = async (userId: string): Promise<Quiz[]> => {
    try {
        // INTENTO 1: Consulta Óptima con Ordenación
        try {
            const q = query(
                collection(db, "quizes"),
                where("userId", "==", userId),
                orderBy("updatedAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            return mapSnapshotToQuizzes(querySnapshot);

        } catch (indexError: any) {
            // FALLBACK: Si falta el índice, hacemos consulta simple y ordenamos en cliente
            if (indexError.code === 'failed-precondition' || indexError.message.includes('index')) {
                console.warn("⚠️ FALTA ÍNDICE EN FIRESTORE. Usando fallback en cliente.");
                
                const qSimple = query(
                    collection(db, "quizes"),
                    where("userId", "==", userId)
                );
                const snapshot = await getDocs(qSimple);
                const results = mapSnapshotToQuizzes(snapshot);
                // Ordenar en memoria
                return results.sort((a, b) => {
                    const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date();
                    const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date();
                    return dateB.getTime() - dateA.getTime();
                });
            }
            throw indexError;
        }
    } catch (e) {
        console.error("Error fetching quizzes:", e);
        throw e;
    }
};

// Helper para mapear documentos a objetos Quiz
const mapSnapshotToQuizzes = (snapshot: any): Quiz[] => {
    const quizzes: Quiz[] = [];
    snapshot.forEach((doc: any) => {
        const data = doc.data();
        quizzes.push({
            id: doc.id,
            ...data,
            // Convertir Timestamp de Firestore a Date JS
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
        });
    });
    return quizzes;
}

/**
 * Borrar Quiz
 */
export const deleteQuizFromFirestore = async (quizId: string) => {
    try {
        await deleteDoc(doc(db, "quizes", quizId));
    } catch (e) {
        console.error("Error deleting quiz:", e);
        throw e;
    }
};
