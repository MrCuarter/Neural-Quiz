
// services/firebaseService.ts
import { Quiz } from "../types";

// IMPORTACIONES DIRECTAS DESDE CDN OFICIAL (VERSION 10.13.0)
// Esto evita el error "Component auth has not been registered" al garantizar que App y Auth usan la misma instancia.
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
    // 1. Inicializar Firebase
    app = initializeApp(firebaseConfig);
    
    // 2. Inicializar Auth
    auth = getAuth(app);
    provider = new GoogleAuthProvider();

    // 3. Inicializar Firestore
    db = getFirestore(app);
    
    console.log("Firebase & Firestore initialized successfully");
} catch (e) {
    console.error("CRITICAL: Firebase Initialization Failed", e);
}

// Exportar instancias y funciones
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

    const collectionRef = collection(db, "quizzes");
    
    // Datos base
    const quizData = {
        userId,
        title: quiz.title || "Untitled Quiz",
        description: quiz.description || "",
        questions: quiz.questions,
        tags: quiz.tags || [],
        updatedAt: serverTimestamp()
    };

    try {
        if (quiz.id && !asCopy) {
            // ACTUALIZAR (UPDATE)
            const docRef = doc(db, "quizzes", quiz.id);
            await updateDoc(docRef, quizData);
            return quiz.id;
        } else {
            // CREAR NUEVO (CREATE)
            // Si es copia, añadimos flag al título o simplemente creamos nuevo doc
            if (asCopy) {
                quizData.title = `${quizData.title} (Copy)`;
            }
            // Add createdAt only for new docs
            const newDocData = { ...quizData, createdAt: serverTimestamp() };
            const docRef = await addDoc(collectionRef, newDocData);
            return docRef.id;
        }
    } catch (e) {
        console.error("Error saving quiz:", e);
        throw e;
    }
};

/**
 * Obtener Quizzes del Usuario
 */
export const getUserQuizzes = async (userId: string): Promise<Quiz[]> => {
    if (!db) return [];

    try {
        const q = query(
            collection(db, "quizzes"),
            where("userId", "==", userId),
            orderBy("updatedAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const quizzes: Quiz[] = [];

        querySnapshot.forEach((doc: any) => {
            const data = doc.data();
            quizzes.push({
                id: doc.id,
                ...data,
                // Convert Firestore timestamps to JS Date objects or keep as is if needed
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
            });
        });

        return quizzes;
    } catch (e) {
        console.error("Error fetching quizzes:", e);
        throw e;
    }
};

/**
 * Borrar Quiz
 */
export const deleteQuizFromFirestore = async (quizId: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, "quizzes", quizId));
    } catch (e) {
        console.error("Error deleting quiz:", e);
        throw e;
    }
};
