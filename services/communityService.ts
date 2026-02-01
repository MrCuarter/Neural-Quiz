
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
export const searchQuizzes = async (searchTerm: string = "", languageFilter: string = "ALL", ageFilter: string = "ALL"): Promise<Quiz[]> => {
    const colRef = collection(db, COLLECTION_NAME);
    const term = searchTerm.toLowerCase().trim();
    const ageTag = ageFilter !== "ALL" ? ageFilter.toLowerCase() : "";

    try {
        // --- PRIMARY STRATEGY: Simple Fetch & Client Filter ---
        // Firestore limits multiple array-contains queries.
        // We fetch public quizzes (sorted if possible) and filter text/tags locally for flexibility.
        
        let q = query(colRef, where("isPublic", "==", true), orderBy("createdAt", "desc"), limit(50));
        
        try {
            const snapshot = await getDocs(q);
            return processResults(snapshot, term, languageFilter, ageTag);
        } catch (indexError) {
            console.warn("[Community] Index missing, falling back to simple query.");
            // Fallback: No sort
            q = query(colRef, where("isPublic", "==", true), limit(50));
            const snapshot = await getDocs(q);
            return processResults(snapshot, term, languageFilter, ageTag);
        }

    } catch (error: any) {
        console.error("[Community] Search failed:", error);
        return [];
    }
};

const processResults = (snapshot: any, term: string, languageFilter: string, ageTag: string): Quiz[] => {
    let results: Quiz[] = [];
    
    snapshot.forEach((doc: any) => {
        const data = doc.data() as DocumentData;
        results.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            questions: data.questions,
            tags: data.tags || [],
            language: data.language || 'es', 
            authorName: data.authorName,
            userId: data.userId, 
            isPublic: data.isPublic,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            visits: data.visits || 0,
            clones: data.clones || 0
        } as Quiz);
    });

    // --- CLIENT SIDE FILTERING ---
    
    // 1. Language
    if (languageFilter !== "ALL") {
        results = results.filter(q => q.language === languageFilter);
    }

    // 2. Age/Grade (Stored as Tags)
    if (ageTag) {
        // Checks if any tag includes the age string (e.g. 'secondary' matches 'secondary education')
        results = results.filter(q => q.tags?.some(t => t.toLowerCase().includes(ageTag)));
    }

    // 3. Search Term (Title or Tags)
    if (term) {
        results = results.filter(q => 
            q.title.toLowerCase().includes(term) || 
            q.tags?.some(t => t.toLowerCase().includes(term))
        );
    }

    // Sort client side just in case fallback query lost order
    return results.sort((a, b) => {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return db - da;
    });
};
