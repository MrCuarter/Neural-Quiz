
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  updateProfile 
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
    } catch (e) { }
    return "";
};

// --- 1. CONFIGURACIÓN DEL PROYECTO ---
const apiKey = getEnv("VITE_API_FIREBASE");
const authDomain = getEnv("VITE_AUTH_DOMAIN");
const projectId = getEnv("VITE_PROJECT_ID");

const isOfflineMode = !apiKey || apiKey === "undefined";

if (isOfflineMode) {
    console.warn("%c⚠️ [FIREBASE] MODO PREVIEW SIN CONEXIÓN", "background: #f59e0b; color: #000; padding: 4px; font-weight: bold; border-radius: 4px;");
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
  try { analytics = getAnalytics(app); } catch (e) { console.warn("Analytics failed:", e); }
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app); 

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

export { onAuthStateChanged, updateProfile };

// --- HELPER DE ERRORES ---
const mapAuthError = (code: string): string => {
    switch (code) {
        case 'auth/email-already-in-use': return "Este correo ya está registrado.";
        case 'auth/invalid-email': return "El correo electrónico no es válido.";
        case 'auth/weak-password': return "La contraseña es muy débil (mínimo 6 caracteres).";
        case 'auth/user-not-found': return "No existe una cuenta con este correo.";
        case 'auth/wrong-password': return "Contraseña incorrecta.";
        case 'auth/invalid-credential': return "Credenciales inválidas.";
        case 'auth/too-many-requests': return "Demasiados intentos. Inténtalo más tarde.";
        case 'auth/popup-closed-by-user': return "Inicio de sesión cancelado.";
        default: return "Error de autenticación: " + code;
    }
};

// --- 4. FUNCIONES DE AUTENTICACIÓN ---

// A. GOOGLE LOGIN
export const signInWithGoogle = async (): Promise<{ user: any, token: string | null }> => {
  if (isOfflineMode) { alert("Modo Preview: Login no disponible."); return { user: null, token: null }; }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    return { user: result.user, token: credential?.accessToken || null };
  } catch (error: any) {
    throw new Error(mapAuthError(error.code));
  }
};

// B. EMAIL REGISTER
export const registerWithEmail = async (email: string, pass: string, name: string) => {
    if (isOfflineMode) throw new Error("Modo offline activo.");
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(userCredential.user, { displayName: name });
        return userCredential.user;
    } catch (error: any) {
        throw new Error(mapAuthError(error.code));
    }
};

// C. EMAIL LOGIN
export const loginWithEmail = async (email: string, pass: string) => {
    if (isOfflineMode) throw new Error("Modo offline activo.");
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        return userCredential.user;
    } catch (error: any) {
        throw new Error(mapAuthError(error.code));
    }
};

// D. LOGOUT
export const logoutFirebase = async () => {
  if (isOfflineMode) return;
  try { await signOut(auth); } catch (error) { console.error("Logout error:", error); }
};

// --- 5. FUNCIONES DE GESTIÓN DE DATOS (FIRESTORE) ---
// (Resto de funciones: saveQuizToFirestore, getUserQuizzes, etc. se mantienen igual)

export const saveQuizToFirestore = async (quiz: Quiz, userId: string, asCopy: boolean = false): Promise<string> => {
    if (isOfflineMode) throw new Error("Offline Mode");
    const currentUser = auth.currentUser;
    const effectiveUid = currentUser?.uid || userId;
    if (!effectiveUid) throw new Error("User ID is undefined");

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
            const docRef = doc(db, "quizzes", quiz.id);
            await updateDoc(docRef, { ...cleanData, updatedAt: serverTimestamp() });
            return quiz.id;
        } else {
            if (asCopy) cleanData.title = `${cleanData.title} (Copy)`;
            const payload = { ...cleanData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
            const docRef = await addDoc(collectionRef, payload);
            return docRef.id;
        }
    } catch (e: any) {
        console.error("Firestore Save Error:", e);
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
    } catch (e) { return true; }
};

export const createEvaluation = async (evaluation: Omit<Evaluation, 'id' | 'createdAt'>): Promise<string> => {
    if (isOfflineMode) throw new Error("Offline Mode");
    const payload = { ...evaluation, createdAt: serverTimestamp(), isActive: true, status: 'active', participants: 0 };
    const docRef = await addDoc(collection(db, "evaluations"), JSON.parse(JSON.stringify(payload)));
    return docRef.id;
};

export const getEvaluation = async (evaluationId: string): Promise<Evaluation> => {
    if (isOfflineMode) throw new Error("Offline Mode");
    const docRef = doc(db, "evaluations", evaluationId);
    const snap = await getDoc(docRef);
    if (snap.exists()) return { id: snap.id, ...snap.data() } as Evaluation;
    throw new Error("Evaluation not found");
};

export const saveEvaluationAttempt = async (attempt: Omit<EvaluationAttempt, 'id' | 'timestamp'>, existingId?: string): Promise<string> => {
    if (isOfflineMode) return "mock-id";
    const payload = { ...attempt, timestamp: serverTimestamp() };
    const cleanPayload = JSON.parse(JSON.stringify(payload));
    if (existingId) {
        await updateDoc(doc(db, "attempts", existingId), cleanPayload);
        return existingId;
    } else {
        const docRef = await addDoc(collection(db, "attempts"), cleanPayload);
        return docRef.id;
    }
};

export const getEvaluationLeaderboard = async (evaluationId: string, limitCount = 50): Promise<EvaluationAttempt[]> => {
    if (isOfflineMode) return [];
    try {
        const q = query(collection(db, "attempts"), where("evaluationId", "==", evaluationId), orderBy("score", "desc"), orderBy("totalTime", "asc"), limit(limitCount));
        const snapshot = await getDocs(q);
        const attempts: EvaluationAttempt[] = [];
        snapshot.forEach(doc => { const data = doc.data(); attempts.push({ id: doc.id, ...data, timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date() } as EvaluationAttempt); });
        return attempts;
    } catch (error: any) {
        if (error.code === 'failed-precondition') {
            const qSimple = query(collection(db, "attempts"), where("evaluationId", "==", evaluationId));
            const snapshot = await getDocs(qSimple);
            const rawAttempts: EvaluationAttempt[] = [];
            snapshot.forEach(doc => rawAttempts.push({ id: doc.id, ...doc.data() } as EvaluationAttempt));
            return rawAttempts.sort((a, b) => (b.score !== a.score) ? b.score - a.score : a.totalTime - b.totalTime).slice(0, limitCount);
        }
        return [];
    }
};

export const getUserQuizzes = async (userId: string): Promise<Quiz[]> => {
    if (isOfflineMode) return [];
    try {
        try {
            const q = query(collection(db, "quizzes"), where("userId", "==", userId), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(), updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date() } as Quiz));
        } catch (idxError: any) {
            if (idxError.code === 'failed-precondition') {
                const qSimple = query(collection(db, "quizzes"), where("userId", "==", userId));
                const snapshot = await getDocs(qSimple);
                const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(), updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date() } as Quiz));
                return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            }
            throw idxError;
        }
    } catch (e) { throw e; }
};

export const deleteQuizFromFirestore = async (quizId: string) => {
    if (isOfflineMode) return;
    await deleteDoc(doc(db, "quizzes", quizId));
};
