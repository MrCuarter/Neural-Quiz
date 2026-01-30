
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
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
  limit,
  setDoc,
  increment
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { Quiz, Evaluation, EvaluationAttempt } from "../types";

// --- 0. HELPER PARA CARGA SEGURA DE VARIABLES DE ENTORNO ---
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
export const storage = getStorage(app);

// --- 3. CONFIGURACIÓN CRÍTICA DEL PROVEEDOR (SCOPES) ---
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

export { onAuthStateChanged, updateProfile };

// --- 4. FUNCIONES DE AUTENTICACIÓN ---

// Helper de Errores
const mapAuthError = (errorCode: string): string => {
    switch (errorCode) {
        case 'auth/email-already-in-use': return "Este correo ya está registrado.";
        case 'auth/invalid-email': return "El correo electrónico no es válido.";
        case 'auth/weak-password': return "La contraseña es muy débil (mínimo 6 caracteres).";
        case 'auth/user-not-found': return "No existe una cuenta con este correo.";
        case 'auth/wrong-password': return "Contraseña incorrecta.";
        case 'auth/popup-closed-by-user': return "Inicio de sesión cancelado.";
        case 'auth/too-many-requests': return "Demasiados intentos. Inténtalo más tarde.";
        default: return "Error de autenticación: " + errorCode;
    }
};

// LOGIN CON GOOGLE
export const signInWithGoogle = async (): Promise<{ user: any, token: string | null }> => {
  if (isOfflineMode) {
      alert("Modo Preview: El inicio de sesión no está disponible sin claves de API.");
      return { user: null, token: null };
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;
    return { user: result.user, token };
  } catch (error: any) {
    console.error("Error Google Auth:", error);
    throw new Error(mapAuthError(error.code));
  }
};

// REGISTRO CON EMAIL
export const registerWithEmail = async (email: string, pass: string, name: string) => {
    if (isOfflineMode) throw new Error("Offline Mode");
    try {
        const result = await createUserWithEmailAndPassword(auth, email, pass);
        // Actualizar nombre inmediatamente
        if (result.user) {
            await updateProfile(result.user, { displayName: name });
        }
        return result.user;
    } catch (error: any) {
        throw new Error(mapAuthError(error.code));
    }
};

// LOGIN CON EMAIL
export const loginWithEmail = async (email: string, pass: string) => {
    if (isOfflineMode) throw new Error("Offline Mode");
    try {
        const result = await signInWithEmailAndPassword(auth, email, pass);
        return result.user;
    } catch (error: any) {
        throw new Error(mapAuthError(error.code));
    }
};

// LOGOUT
export const logoutFirebase = async () => {
  if (isOfflineMode) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logout:", error);
  }
};

// ... RESTO DE FUNCIONES DE FIRESTORE (saveQuizToFirestore, etc.) SE MANTIENEN IGUAL ...
// --- 5. FUNCIONES DE GESTIÓN DE DATOS (FIRESTORE) ---

export const saveQuizToFirestore = async (quiz: Quiz, userId: string, asCopy: boolean = false): Promise<string> => {
    if (isOfflineMode) {
        throw new Error("No se puede guardar en modo Preview/Offline.");
    }
    const currentUser = auth.currentUser;
    const effectiveUid = currentUser?.uid || userId;

    if (!effectiveUid) throw new Error("User ID is undefined or null");

    const collectionRef = collection(db, "quizzes");
    
    const rawData = {
        userId: effectiveUid,
        title: quiz.title || "Untitled Quiz",
        description: quiz.description || "",
        questions: quiz.questions || [],
        tags: quiz.tags || []
    };

    const cleanData = JSON.parse(JSON.stringify(rawData));

    try {
        if (quiz.id && !asCopy) {
            const payload = { ...cleanData, updatedAt: serverTimestamp() };
            const docRef = doc(db, "quizzes", quiz.id);
            await updateDoc(docRef, payload);
            return quiz.id;
        } else {
            if (asCopy) cleanData.title = `${cleanData.title} (Copy)`;
            const payload = { ...cleanData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
            const docRef = await addDoc(collectionRef, payload);
            return docRef.id;
        }
    } catch (e: any) {
        console.error("🔥 Error al guardar en Firestore.", e);
        throw e;
    }
};

export const checkAndIncrementRaidLimit = async (userId: string): Promise<boolean> => {
    if (isOfflineMode) return true;
    const today = new Date().toISOString().slice(0, 10);
    const userRef = doc(db, "users", userId);
    try {
        const userSnap = await getDoc(userRef);
        let currentCount = 0;
        let lastRaidDate = "";
        if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.dailyRaids) {
                currentCount = data.dailyRaids.count || 0;
                lastRaidDate = data.dailyRaids.date || "";
            }
        }
        if (lastRaidDate !== today) currentCount = 0;
        if (currentCount >= 3) return false;
        await setDoc(userRef, { dailyRaids: { date: today, count: currentCount + 1 } }, { merge: true });
        return true;
    } catch (e) {
        return true; 
    }
};

export const createEvaluation = async (evaluation: Omit<Evaluation, 'id' | 'createdAt'>): Promise<string> => {
    if (isOfflineMode) throw new Error("Offline Mode");
    try {
        const payload = { ...evaluation, createdAt: serverTimestamp(), isActive: true, status: 'active', participants: 0 };
        const cleanPayload = JSON.parse(JSON.stringify(payload));
        const docRef = await addDoc(collection(db, "evaluations"), cleanPayload);
        return docRef.id;
    } catch (error: any) {
        throw error;
    }
};

export const getEvaluation = async (evaluationId: string): Promise<Evaluation> => {
    if (isOfflineMode) throw new Error("Offline Mode");
    try {
        const docRef = doc(db, "evaluations", evaluationId);
        const snap = await getDoc(docRef);
        if (snap.exists()) return { id: snap.id, ...snap.data() } as Evaluation;
        else throw new Error("Evaluation not found");
    } catch (error) { throw error; }
};

export const saveEvaluationAttempt = async (attempt: Omit<EvaluationAttempt, 'id' | 'timestamp'>, existingId?: string): Promise<string> => {
    if (isOfflineMode) return "mock-attempt-id";
    try {
        const payload = { ...attempt, timestamp: serverTimestamp() };
        const cleanPayload = JSON.parse(JSON.stringify(payload));
        if (existingId) {
            const docRef = doc(db, "attempts", existingId);
            await updateDoc(docRef, cleanPayload);
            return existingId;
        } else {
            const docRef = await addDoc(collection(db, "attempts"), cleanPayload);
            return docRef.id;
        }
    } catch (error) { throw error; }
};

export const getEvaluationLeaderboard = async (evaluationId: string, limitCount = 50): Promise<EvaluationAttempt[]> => {
    if (isOfflineMode) return [];
    try {
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
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
            } as EvaluationAttempt);
        });
        return attempts;
    } catch (error: any) {
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
            const qSimple = query(collection(db, "attempts"), where("evaluationId", "==", evaluationId));
            const snapshot = await getDocs(qSimple);
            const rawAttempts: EvaluationAttempt[] = [];
            snapshot.forEach(doc => rawAttempts.push({ id: doc.id, ...doc.data() } as EvaluationAttempt));
            return rawAttempts.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.totalTime - b.totalTime;
            }).slice(0, limitCount);
        }
        return [];
    }
};

export const getUserQuizzes = async (userId: string): Promise<Quiz[]> => {
    if (isOfflineMode) return [];
    try {
        try {
            const q = query(collection(db, "quizzes"), where("userId", "==", userId), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            return mapSnapshotToQuizzes(querySnapshot);
        } catch (indexError: any) {
            if (indexError.code === 'failed-precondition' || indexError.message.includes('index')) {
                const qSimple = query(collection(db, "quizzes"), where("userId", "==", userId));
                const snapshot = await getDocs(qSimple);
                const results = mapSnapshotToQuizzes(snapshot);
                return results.sort((a, b) => {
                    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date();
                    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date();
                    return dateB.getTime() - dateA.getTime();
                });
            }
            throw indexError;
        }
    } catch (e) { throw e; }
};

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

export const deleteQuizFromFirestore = async (quizId: string) => {
    if (isOfflineMode) return;
    try { await deleteDoc(doc(db, "quizzes", quizId)); } catch (e) { throw e; }
};
