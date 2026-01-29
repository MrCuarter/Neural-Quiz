
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged as onAuthStateChangedFirebase,
  updateProfile as updateProfileFirebase,
  signInAnonymously as signInAnonymouslyFirebase,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
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
  increment,
  Timestamp
} from "firebase/firestore";
import { getStorage, deleteObject, ref } from "firebase/storage"; 
import { getAnalytics } from "firebase/analytics";
import { Quiz, Evaluation, EvaluationAttempt, TeacherProfile } from "../types";

// --- HELPER FOR SAFE ENV ACCESS ---
const getEnv = (key: string): string => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env[key] || "";
        }
    } catch (e) {}
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key] || "";
        }
    } catch (e) {}
    return "";
};

// --- DATA SANITIZATION HELPER ---
/**
 * Recursively converts undefined values to null.
 * Firestore does not support undefined, so we must ensure all optional fields are null.
 */
const sanitizeData = (data: any): any => {
    if (data === undefined) return null;
    if (data === null) return null;
    if (data instanceof Date) return data;
    
    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
    }
    
    if (typeof data === 'object') {
        const newObj: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                newObj[key] = sanitizeData(data[key]);
            }
        }
        return newObj;
    }
    
    return data;
};

// --- CONFIGURACIÓN DE FIREBASE ---
const apiKey = getEnv("VITE_API_FIREBASE");
const isOfflineMode = !apiKey || apiKey.length < 5; // Detect missing key

let app: any;
let dbInstance: any;
let authInstance: any;
let storageInstance: any;

if (!isOfflineMode) {
    try {
        // DATOS CORRECTOS PROYECTO ORIGINAL (UNA-PARA-TODAS)
        const firebaseConfig = {
          apiKey: apiKey,
          authDomain: "una-para-todas.firebaseapp.com",
          projectId: "una-para-todas",
          storageBucket: "una-para-todas.firebasestorage.app",
          messagingSenderId: "1005385021667",
          appId: "1:1005385021667:web:b0c13438ab526d29bcadd6"
        };
        
        // Prevent multiple initializations
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        dbInstance = getFirestore(app);
        authInstance = getAuth(app);
        storageInstance = getStorage(app);
        
        if (typeof window !== 'undefined') {
            try { getAnalytics(app); } catch (e) {}
        }
        console.log("🔥 Firebase initialized successfully (Project: una-para-todas).");
    } catch (e) {
        console.error("Firebase init failed:", e);
    }
} else {
    console.warn("⚠️ Firebase API Key missing. Running in PREVIEW/OFFLINE mode. Database features will be disabled.");
}

// Exports (Safe wrappers)
export const db = dbInstance || {};
export const auth = authInstance || { currentUser: null }; 
export const storage = storageInstance || {};
export const googleProvider = new GoogleAuthProvider();

if (!isOfflineMode) {
    googleProvider.addScope('https://www.googleapis.com/auth/forms.body');
    googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
    googleProvider.addScope('https://www.googleapis.com/auth/presentations');
}

// --- 1. AUTHENTICATION WRAPPERS ---

export const onAuthStateChanged = (authInst: any, callback: any) => {
    if (isOfflineMode || !authInst.onAuthStateChanged) {
        callback(null); 
        return () => {}; 
    }
    return onAuthStateChangedFirebase(authInst, callback);
};

export const signInWithGoogle = async (): Promise<{ user: any, token: string | null }> => {
    if (isOfflineMode) throw new Error("Offline Mode: Auth disabled");
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken || null;
        return { user: result.user, token };
    } catch (error) {
        console.error("Error en Google Sign In:", error);
        throw error;
    }
};

export const registerWithEmail = async (email: string, pass: string) => {
    if (isOfflineMode) throw new Error("Offline Mode");
    return createUserWithEmailAndPassword(auth, email, pass);
};

export const loginWithEmail = async (email: string, pass: string) => {
    if (isOfflineMode) throw new Error("Offline Mode");
    return signInWithEmailAndPassword(auth, email, pass);
};

export const resetPassword = async (email: string) => {
    if (isOfflineMode) throw new Error("Offline Mode");
    return sendPasswordResetEmail(auth, email);
};

export const signInAnonymously = async () => {
    if (isOfflineMode) {
        return { user: { uid: "guest_offline", isAnonymous: true } };
    }
    return signInAnonymouslyFirebase(auth);
};

export const logoutFirebase = async () => {
    if (isOfflineMode) return;
    await signOut(auth);
};

export const updateProfile = async (user: any, profile: any) => {
    if (isOfflineMode) return;
    return updateProfileFirebase(user, profile);
};

// --- 2. FIRESTORE: QUIZZES ---

export const saveQuizToFirestore = async (quiz: Quiz, userId: string, asCopy: boolean = false): Promise<string> => {
    if (isOfflineMode) return "offline-id-" + Math.random();
    try {
        const colRef = collection(db, "quizzes");
        
        // 1. Sanitize Data (undefined -> null)
        // Note: We sanitize the quiz object BEFORE merging with serverTimestamp
        // because serverTimestamp() returns a Sentinel object that we don't want to clone/destroy.
        const cleanQuiz = sanitizeData(quiz);

        const payload: any = { 
            ...cleanQuiz, 
            userId, 
            updatedAt: serverTimestamp() 
        };

        if (!quiz.id || asCopy) {
            payload.createdAt = serverTimestamp();
            delete payload.id; 
            const docRef = await addDoc(colRef, payload);
            return docRef.id;
        } else {
            await updateDoc(doc(db, "quizzes", quiz.id), payload);
            return quiz.id;
        }
    } catch (e) { 
        console.error("Error saving quiz:", e);
        throw e; 
    }
};

export const getUserQuizzes = async (userId: string): Promise<Quiz[]> => {
    if (isOfflineMode) return [];
    try {
        const q = query(
            collection(db, "quizzes"), 
            where("userId", "==", userId), 
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
    } catch (e: any) {
        const qSimple = query(collection(db, "quizzes"), where("userId", "==", userId));
        const snapshot = await getDocs(qSimple);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
    }
};

export const deleteQuizFromFirestore = async (quizId: string) => {
    if (isOfflineMode) return;
    await deleteDoc(doc(db, "quizzes", quizId));
};

// --- 3. EVALUATIONS & GAMEPLAY ---

export const createEvaluation = async (evaluation: any): Promise<string> => {
    if (isOfflineMode) return "offline-eval-id";
    // Sanitize evaluation payload as well to be safe
    const cleanEvaluation = sanitizeData(evaluation);
    const docRef = await addDoc(collection(db, "evaluations"), { 
        ...cleanEvaluation, 
        createdAt: serverTimestamp() 
    });
    return docRef.id;
};

export const getEvaluation = async (evaluationId: string): Promise<Evaluation> => {
    if (isOfflineMode) throw new Error("Offline mode");
    const snap = await getDoc(doc(db, "evaluations", evaluationId));
    if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Evaluation;
    }
    throw new Error("Evaluation not found");
};

export const saveEvaluationAttempt = async (attempt: any, existingId?: string): Promise<string> => {
    if (isOfflineMode) return "offline-attempt-id";
    const cleanAttempt = sanitizeData(attempt);
    const payload = { ...cleanAttempt, timestamp: serverTimestamp() };
    
    if (existingId) {
        await updateDoc(doc(db, "attempts", existingId), payload);
        return existingId;
    } else {
        const ref = await addDoc(collection(db, "attempts"), payload);
        return ref.id;
    }
};

export const getEvaluationLeaderboard = async (evaluationId: string, limitCount = 50): Promise<EvaluationAttempt[]> => {
    if (isOfflineMode) return [];
    try {
        const q = query(
            collection(db, "attempts"), 
            where("evaluationId", "==", evaluationId), 
            orderBy("score", "desc"), 
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as EvaluationAttempt));
    } catch (e) {
        const q = query(collection(db, "attempts"), where("evaluationId", "==", evaluationId));
        const snap = await getDocs(q);
        let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as EvaluationAttempt));
        return data.sort((a,b) => b.score - a.score).slice(0, limitCount);
    }
};

// --- 4. RAID LIMIT LOGIC (REAL) ---

export const checkAndIncrementRaidLimit = async (userId: string): Promise<boolean> => {
    if (isOfflineMode) return true;
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; 

    if (!snap.exists()) {
        await setDoc(userRef, { 
            raidLimit: { date: todayStr, count: 1 } 
        }, { merge: true });
        return true;
    }

    const data = snap.data();
    const raidData = data.raidLimit || { date: '', count: 0 };

    if (raidData.date !== todayStr) {
        await updateDoc(userRef, { 
            raidLimit: { date: todayStr, count: 1 } 
        });
        return true;
    } else {
        if (raidData.count >= 3) {
            return false;
        }
        await updateDoc(userRef, {
            "raidLimit.count": increment(1)
        });
        return true;
    }
};

// --- 5. USER DATA & STORAGE ---

export const updateUserData = async (userId: string, data: TeacherProfile) => {
    if (isOfflineMode) return;
    const cleanData = sanitizeData(data);
    await setDoc(doc(db, "users", userId), { profile: cleanData }, { merge: true });
};

export const getUserData = async (userId: string): Promise<TeacherProfile | null> => {
    if (isOfflineMode) return null;
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? snap.data().profile : null;
};

export const deleteFile = async (url: string) => {
    if (isOfflineMode) return;
    try { await deleteObject(ref(storage, url)); } catch(e) {}
};
