
import { 
    db, 
    auth 
} from "./firebaseService";
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs, 
    updateDoc,
    doc,
    serverTimestamp,
    DocumentData
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { Quiz } from "../types";

// REFACTOR: Single Collection Source of Truth
const COLLECTION_NAME = "quizzes";

/**
 * Publish a Quiz (Now just sets isPublic = true and updates metadata)
 */
export const publishQuiz = async (quiz: Quiz, finalTags: string[]): Promise<string> => {
    // 1. Authentication Check
    let user = auth.currentUser;
    if (!user) {
        console.log("[Community] No user found. Signing in anonymously...");
        const result = await signInAnonymously(auth);
        user = result.user;
    }

    if (!user) throw new Error("Authentication failed. Cannot publish.");
    if (!quiz.id) throw new Error("Quiz must be saved before publishing.");

    // 2. Prepare Update Data
    // We update the existing document in 'quizzes' instead of creating a copy
    const publicData = {
        isPublic: true, // THE KEY FLAG
        tags: (finalTags || []).map(t => t.toLowerCase().trim()),
        language: quiz.language || 'es', // Ensure language is saved
        
        // Ensure author metadata is up to date
        authorName: user.isAnonymous ? "Comunidad NeuralQuiz" : (user.displayName || "Usuario"),
        authorPhoto: user.isAnonymous ? null : (user.photoURL || null),
        
        updatedAt: serverTimestamp(),
        publishedAt: serverTimestamp() // Track when it went live
    };

    try {
        const docRef = doc(db, COLLECTION_NAME, quiz.id);
        await updateDoc(docRef, publicData);
        console.log("[Community] Quiz Published Successfully (Flag Updated). ID:", quiz.id);
        return quiz.id;
    } catch (error: any) {
        console.error("[Community] Publish Error:", error);
        throw new Error(`Error al publicar: ${error.message}`);
    }
};

/**
 * Search Quizzes in Community
 * Queries the main 'quizzes' collection where isPublic == true
 */
export const searchQuizzes = async (searchTerm: string = "", languageFilter: string = "ALL"): Promise<Quiz[]> => {
    const colRef = collection(db, COLLECTION_NAME);
    let q;

    const term = searchTerm.toLowerCase().trim();

    try {
        // BASE QUERY: Must be public
        const constraints: any[] = [where("isPublic", "==", true)];

        // Language Filter
        if (languageFilter !== "ALL") {
            constraints.push(where("language", "==", languageFilter));
        }

        // Search Term (Tags)
        if (term) {
            constraints.push(where("tags", "array-contains", term));
        }

        // Ordering (Newest First)
        constraints.push(orderBy("createdAt", "desc"));
        constraints.push(limit(20));

        q = query(colRef, ...constraints);

        const snapshot = await getDocs(q);
        return mapSnapshotToQuizzes(snapshot);

    } catch (error: any) {
        console.warn("[Community] Index missing or query failed. Attempting fallback...");
        
        // --- FALLBACK ATTEMPT (Client-side Filtering) ---
        // If specific index is missing, fetch broader set and filter locally
        try {
            // Simplified Query (Just Public)
            let qFallback = query(colRef, where("isPublic", "==", true), orderBy("createdAt", "desc"), limit(50));
            
            // If ordering fails too, try unordered
            if (error.code === 'failed-precondition') {
                 qFallback = query(colRef, where("isPublic", "==", true), limit(50));
            }

            const snapshot = await getDocs(qFallback);
            let results = mapSnapshotToQuizzes(snapshot);

            // Client-side Filter: Language
            if (languageFilter !== "ALL") {
                results = results.filter(q => q.language === languageFilter);
            }

            // Client-side Filter: Tags
            if (term) {
                results = results.filter(q => q.tags?.some(t => t.toLowerCase().includes(term)));
            }
            
            // Client-side Sort (Newest first)
            return results.sort((a, b) => {
                const da = new Date(a.createdAt).getTime();
                const db = new Date(b.createdAt).getTime();
                return db - da;
            });

        } catch (fallbackError) {
            console.error("[Community] Fallback failed too:", fallbackError);
            return [];
        }
    }
};

// Helper
const mapSnapshotToQuizzes = (snapshot: any): Quiz[] => {
    const results: Quiz[] = [];
    snapshot.forEach((doc: any) => {
        const data = doc.data() as DocumentData;
        results.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            questions: data.questions,
            tags: data.tags,
            language: data.language || 'es', // Default to 'es' if missing
            authorName: data.authorName,
            userId: data.userId, // Keep track of owner
            isPublic: data.isPublic,
            // Convert timestamp safely
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            visits: data.visits || 0,
            clones: data.clones || 0
        } as Quiz);
    });
    return results;
};
