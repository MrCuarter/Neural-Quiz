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
  getDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  limit
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { Quiz, Evaluation, EvaluationAttempt } from "../types";

// --- 0. HELPER PARA CARGA SEGURA DE VARIABLES DE ENTORNO ---
// Evita el crash "Cannot read properties of undefined" en entornos sin env vars
const getEnv = (key: string): string => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env[key] || "";
        }
    } catch (e) {
        // Silencioso en caso de error de acceso
    }
    return "";
};

// --- 1. CONFIGURACIÓN DEL PROYECTO ---
const apiKey = getEnv("VITE_API_FIREBASE");
const authDomain = getEnv("VITE_AUTH_DOMAIN");
const projectId = getEnv("VITE_PROJECT_ID");

// Detección de entorno sin conexión
const isOfflineMode = !apiKey || apiKey === "undefined";

if (isOfflineMode) {
    console.warn(
        "%c⚠️ [FIREBASE] MODO PREVIEW SIN CONEXIÓN", 
        "background: #f59e0b; color: #000; padding: 4px; font-weight: bold; border-radius: 4px;"
    );
    console.warn("No se detectaron claves de API. La interfaz cargará, pero la autenticación y base de datos no funcionarán.");
}

const firebaseConfig = { 
  apiKey: apiKey || "DEV_MODE_DUMMY_KEY", 
  authDomain: authDomain || "dev-mode.firebaseapp.com", 
  projectId: projectId || "dev-mode-project", 
  storageBucket: getEnv("VITE_STORAGE_BUCKET") || "una-para-todas.firebasestorage.app", 
  messagingSenderId: getEnv("VITE_MESSAGING_SENDER_ID") || "1005385021667", 
  appId: getEnv("VITE_APP_ID") || "1:1005385021667:web:b0c13438ab526d29bcadd6", 
  measurementId: getEnv("VITE_MEASUREMENT_ID") || "G-M5VDERWPRJ" 
};

// --- 2. INICIALIZACIÓN ---
const app = initializeApp(firebaseConfig);

// Inicializar Analytics solo si estamos en un entorno de navegador y hay conexión
let analytics;
if (typeof window !== 'undefined' && !isOfflineMode) {
  try {
      analytics = getAnalytics(app);
  } catch (e) {
      console.warn("Analytics failed to load:", e);
  }
}

export const db = getFirestore(app);
export const auth = getAuth(app);

// --- 3. CONFIGURACIÓN CRÍTICA DEL PROVEEDOR (SCOPES) ---
export const googleProvider = new GoogleAuthProvider();

// Scopes reducidos para verificación de Google. 
// 'drive.file' permite a la app ver y editar solo los archivos que ella misma ha creado.
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// Exportamos onAuthStateChanged para uso en componentes
export { onAuthStateChanged };

if (!isOfflineMode) {
    console.log("🔥 Firebase (NPM) inicializado correctamente.");
}

// --- 4. FUNCIONES DE AUTENTICACIÓN ---

export const signInWithGoogle = async (): Promise<{ user: any, token: string | null }> => {
  if (isOfflineMode) {
      alert("Modo Preview: El inicio de sesión no está disponible sin claves de API.");
      return { user: null, token: null };
  }
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
  if (isOfflineMode) return;
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
    if (isOfflineMode) {
        console.warn("Save canceled: Offline Mode");
        throw new Error("No se puede guardar en modo Preview/Offline.");
    }

    // Verificación de usuario
    const currentUser = auth.currentUser;
    const effectiveUid = currentUser?.uid || userId;

    if (!effectiveUid) {
        console.error("CRITICAL SAVE ERROR: No User ID available.");
        alert("Error crítico: No se puede guardar sin un usuario autenticado.");
        throw new Error("User ID is undefined or null");
    }

    // REFACTOR: 'quizzes' collection
    const collectionRef = collection(db, "quizzes");
    
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

            // REFACTOR: 'quizzes' collection
            const docRef = doc(db, "quizzes", quiz.id);
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
        console.error("🔥 Error al guardar en Firestore.");
        console.error(">> Datos:", cleanData); 
        console.error(">> Error:", e);
        throw e;
    }
};

/**
 * Create a new Arcade Evaluation
 */
export const createEvaluation = async (evaluation: Omit<Evaluation, 'id' | 'createdAt'>): Promise<string> => {
    if (isOfflineMode) throw new Error("Offline Mode");
    try {
        const payload = {
            ...evaluation,
            createdAt: serverTimestamp(),
            isActive: true,
            participants: 0
        };
        
        // Sanitize to remove undefined
        const cleanPayload = JSON.parse(JSON.stringify(payload));
        
        const docRef = await addDoc(collection(db, "evaluations"), cleanPayload);
        return docRef.id;
    } catch (error: any) {
        console.error("Error creating evaluation:", error);
        throw error;
    }
};

/**
 * Get Evaluation by ID (Public Access)
 */
export const getEvaluation = async (evaluationId: string): Promise<Evaluation> => {
    if (isOfflineMode) throw new Error("Offline Mode");
    try {
        const docRef = doc(db, "evaluations", evaluationId);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() } as Evaluation;
        } else {
            throw new Error("Evaluation not found");
        }
    } catch (error) {
        console.error("Error fetching evaluation:", error);
        throw error;
    }
};

/**
 * Save Evaluation Attempt (Leaderboard Data)
 */
export const saveEvaluationAttempt = async (attempt: Omit<EvaluationAttempt, 'id' | 'timestamp'>): Promise<string> => {
    if (isOfflineMode) {
        console.warn("Saving attempt mocked in Offline Mode");
        return "mock-attempt-id";
    }
    
    try {
        const payload = {
            ...attempt,
            timestamp: serverTimestamp()
        };
        
        const cleanPayload = JSON.parse(JSON.stringify(payload));
        const docRef = await addDoc(collection(db, "attempts"), cleanPayload);
        
        // Increment participant count in parent evaluation (Optional but good for stats)
        // const evalRef = doc(db, "evaluations", attempt.evaluationId);
        // updateDoc(evalRef, { participants: increment(1) }); // Need 'increment' imported from firestore

        return docRef.id;
    } catch (error) {
        console.error("Error saving attempt:", error);
        throw error;
    }
};

/**
 * Get Leaderboard for Evaluation
 * Sorts by Score (DESC) then Total Time (ASC)
 */
export const getEvaluationLeaderboard = async (evaluationId: string, limitCount = 50): Promise<EvaluationAttempt[]> => {
    if (isOfflineMode) return []; // Mock data handled in component?
    
    try {
        // Requires composite index in Firestore: score DESC, totalTime ASC
        const q = query(
            collection(db, "attempts"),
            where("evaluationId", "==", evaluationId),
            orderBy("score", "desc"),
            orderBy("totalTime", "asc"),
            limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        const attempts: EvaluationAttempt[] = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            attempts.push({
                id: doc.id,
                ...data,
                // Convert server timestamp to Date if needed, handling potential null pending writes
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
            } as EvaluationAttempt);
        });
        
        return attempts;
    } catch (error: any) {
        // Fallback for missing index error
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
            console.warn("⚠️ Missing Firestore Index for Leaderboard. Falling back to client-side sort.");
            
            const qSimple = query(
                collection(db, "attempts"),
                where("evaluationId", "==", evaluationId)
            );
            const snapshot = await getDocs(qSimple);
            const rawAttempts: EvaluationAttempt[] = [];
            snapshot.forEach(doc => rawAttempts.push({ id: doc.id, ...doc.data() } as EvaluationAttempt));
            
            // Client-side Sort
            return rawAttempts.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score; // Score DESC
                return a.totalTime - b.totalTime; // Time ASC
            }).slice(0, limitCount);
        }
        console.error("Error fetching leaderboard:", error);
        return [];
    }
};

/**
 * Obtener Quizzes del Usuario con Fallback de Índice
 */
export const getUserQuizzes = async (userId: string): Promise<Quiz[]> => {
    if (isOfflineMode) return [];
    try {
        // REFACTOR: 'quizzes' collection and 'createdAt' sort
        try {
            const q = query(
                collection(db, "quizzes"),
                where("userId", "==", userId),
                orderBy("createdAt", "desc") // REFACTOR: createdAt desc
            );
            const querySnapshot = await getDocs(q);
            return mapSnapshotToQuizzes(querySnapshot);

        } catch (indexError: any) {
            // FALLBACK: Si falta el índice, hacemos consulta simple y ordenamos en cliente
            if (indexError.code === 'failed-precondition' || indexError.message.includes('index')) {
                console.warn("⚠️ FALTA ÍNDICE EN FIRESTORE. Usando fallback en cliente.");
                
                const qSimple = query(
                    collection(db, "quizzes"),
                    where("userId", "==", userId)
                );
                const snapshot = await getDocs(qSimple);
                const results = mapSnapshotToQuizzes(snapshot);
                // Ordenar en memoria (REFACTOR: createdAt)
                return results.sort((a, b) => {
                    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date();
                    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date();
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
    if (isOfflineMode) return;
    try {
        // REFACTOR: 'quizzes' collection
        await deleteDoc(doc(db, "quizzes", quizId));
    } catch (e) {
        console.error("Error deleting quiz:", e);
        throw e;
    }
};