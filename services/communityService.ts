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
export const searchQuizzes = async (searchTerm: string = ""): Promise<Quiz[]> => {
    const colRef = collection(db, COLLECTION_NAME);
    let q;

    const term = searchTerm.toLowerCase().trim();

    try {
        if (!term) {
            // Default: Latest Public Quizzes
            // Requires Index: isPublic Asc/Desc + createdAt Desc
            q = query(
                colRef, 
                where("isPublic", "==", true),
                orderBy("createdAt", "desc"), 
                limit(20)
            );
        } else {
            // Search by Tag
            // Requires Index: isPublic Asc/Desc + tags ArrayContains + createdAt Desc
            q = query(
                colRef, 
                where("isPublic", "==", true),
                where("tags", "array-contains", term),
                orderBy("createdAt", "desc"),
                limit(20)
            );
        }

        const snapshot = await getDocs(q);
        const results: Quiz[] = [];
        
        snapshot.forEach(doc => {
            const data = doc.data() as DocumentData;
            results.push({
                id: doc.id,
                title: data.title,
                description: data.description,
                questions: data.questions,
                tags: data.tags,
                authorName: data.authorName,
                userId: data.userId, // Keep track of owner
                isPublic: data.isPublic,
                // Convert timestamp
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                visits: data.visits || 0,
                clones: data.clones || 0
            } as Quiz);
        });
        
        return results;

    } catch (error: any) {
        console.error("[Community] Search Error:", error);
        
        // Helpful warning for Index creation
        if (error.code === 'failed-precondition') {
            console.warn("⚠️ FALTA ÍNDICE EN FIRESTORE. Abre la consola de Firebase > Firestore > Indexes y crea:");
            console.warn("1. quizzes: isPublic (Asc) + createdAt (Desc)");
            console.warn("2. quizzes: isPublic (Asc) + tags (Array) + createdAt (Desc)");
        }
        
        return [];
    }
};