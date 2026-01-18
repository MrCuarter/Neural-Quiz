
// services/firebaseService.ts
import { Quiz } from "../types";

// IMPORTACIONES DIRECTAS DESDE CDN OFICIAL (VERSION 10.13.0)
// @ts-ignore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
// @ts-ignore
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
// @ts-ignore
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

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
let db: any;
let provider: any;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
    db = getFirestore(app);
    console.log("Firebase & Firestore initialized successfully");
} catch (e) {
    console.error("CRITICAL: Firebase Initialization Failed", e);
}

export { auth, onAuthStateChanged, db };

// --- AUTH FUNCTIONS ---

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

export const logoutFirebase = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
};

// --- FIRESTORE QUIZ FUNCTIONS ---

/**
 * Guardar o Actualizar un Quiz
 */
export const saveQuizToFirestore = async (quiz: Quiz, userId: string, asCopy: boolean = false): Promise<string> => {
    if (!db) throw new Error("Firestore not initialized");

    // 1. VERIFICACIÓN DE USUARIO ESTRICTA
    // Usamos auth.currentUser como fuente de verdad si está disponible, o el userId pasado como fallback.
    const currentUser = auth.currentUser;
    const effectiveUid = currentUser?.uid || userId;

    if (!effectiveUid) {
        console.error("CRITICAL SAVE ERROR: No User ID available.");
        alert("Error crítico: No se puede guardar sin un usuario autenticado.");
        throw new Error("User ID is undefined or null");
    }

    const collectionRef = collection(db, "quizes");
    
    // Construimos el objeto base.
    // NOTA: No incluimos serverTimestamp aquí todavía para que no se pierda en el stringify.
    const rawData = {
        userId: effectiveUid,
        title: quiz.title || "Untitled Quiz",
        description: quiz.description || "",
        questions: quiz.questions || [],
        tags: quiz.tags || []
    };

    // 2. LIMPIEZA DE DATOS (JSON TRICK)
    // Esto elimina recursivamente cualquier propiedad con valor 'undefined',
    // que es lo que causa el error "Unsupported field value: undefined" en Firestore.
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
            // Añadimos el timestamp DESPUÉS de la limpieza JSON
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
            
            // Añadimos timestamps DESPUÉS de la limpieza JSON
            const payload = { 
                ...cleanData, 
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp() 
            };

            const docRef = await addDoc(collectionRef, payload);
            return docRef.id;
        }
    } catch (e: any) {
        // 3. CONSOLA DETALLADA
        console.error("🔥 Error al guardar en Firestore.");
        console.error(">> Datos limpiados enviados:", cleanData); // Vemos qué intentamos mandar
        console.error(">> Error original:", e);
        throw e;
    }
};

/**
 * Obtener Quizzes del Usuario con Fallback de Índice
 */
export const getUserQuizzes = async (userId: string): Promise<Quiz[]> => {
    if (!db) return [];

    try {
        // INTENTO 1: Consulta Óptima con Ordenación (Requiere Índice Compuesto en Firebase)
        // IMPORTANTE: Si ves un error en consola con un enlace azul, HAZ CLIC EN EL ENLACE para crear el índice.
        try {
            const q = query(
                collection(db, "quizes"),
                where("userId", "==", userId),
                orderBy("updatedAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            return mapSnapshotToQuizzes(querySnapshot);

        } catch (indexError: any) {
            // FALLBACK: Si falla por falta de índice (FAILED_PRECONDITION), hacemos consulta simple sin orden
            // y ordenamos en el cliente.
            if (indexError.code === 'failed-precondition' || indexError.message.includes('index')) {
                console.warn("⚠️ FALTA ÍNDICE EN FIRESTORE. Revisa la consola para el enlace de creación. Usando fallback sin ordenación.");
                console.warn(indexError.message); // AQUÍ APARECE EL LINK AZUL
                
                const qSimple = query(
                    collection(db, "quizes"),
                    where("userId", "==", userId)
                );
                const snapshot = await getDocs(qSimple);
                // Ordenamos en cliente como fallback
                const results = mapSnapshotToQuizzes(snapshot);
                return results.sort((a, b) => {
                    const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date();
                    const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date();
                    return dateB.getTime() - dateA.getTime();
                });
            }
            throw indexError; // Si es otro error, lanzarlo
        }
    } catch (e) {
        console.error("Error fetching quizzes:", e);
        throw e;
    }
};

// Helper para mapear datos
const mapSnapshotToQuizzes = (snapshot: any): Quiz[] => {
    const quizzes: Quiz[] = [];
    snapshot.forEach((doc: any) => {
        const data = doc.data();
        quizzes.push({
            id: doc.id,
            ...data,
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
    if (!db) return;
    try {
        await deleteDoc(doc(db, "quizes", quizId));
    } catch (e) {
        console.error("Error deleting quiz:", e);
        throw e;
    }
};
