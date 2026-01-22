
import { 
    db, 
    auth 
} from "./firebaseService";
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs, 
    serverTimestamp,
    DocumentData
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { Quiz } from "../types";

const PUBLIC_COLLECTION = "public_quizzes";

/**
 * Ensures user is authenticated (Anonymously if needed)
 */
const ensureAuth = async () => {
    if (!auth.currentUser) {
        console.log("[Community] No user. Signing in anonymously...");
        await signInAnonymously(auth);
    }
    return auth.currentUser;
};

/**
 * Publish a Quiz to the Community
 */
export const publishQuiz = async (quiz: Quiz, finalTags: string[]): Promise<string> => {
    const user = await ensureAuth();
    if (!user) throw new Error("Authentication failed.");

    // Clean data for public view
    const publicData = {
        title: quiz.title,
        description: quiz.description || "Sin descripción",
        questions: quiz.questions,
        tags: finalTags.map(t => t.toLowerCase().trim()),
        authorId: user.uid,
        authorName: quiz.authorName || (user.isAnonymous ? "Anónimo" : user.displayName || "Usuario"),
        createdAt: serverTimestamp(),
        likes: 0,
        plays: 0,
        isPublic: true
    };

    try {
        const docRef = await addDoc(collection(db, PUBLIC_COLLECTION), publicData);
        console.log("[Community] Quiz Published ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("[Community] Publish Error:", error);
        throw error;
    }
};

/**
 * Search Quizzes in Community
 */
export const searchQuizzes = async (searchTerm: string = ""): Promise<Quiz[]> => {
    const colRef = collection(db, PUBLIC_COLLECTION);
    let q;

    const term = searchTerm.toLowerCase().trim();

    if (!term) {
        // Default: Latest 20
        q = query(colRef, orderBy("createdAt", "desc"), limit(20));
    } else {
        // Search by Tag
        q = query(
            colRef, 
            where("tags", "array-contains", term),
            orderBy("createdAt", "desc"),
            limit(20)
        );
    }

    try {
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
                // Convert timestamp
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                // ... map other fields if needed
            } as Quiz);
        });
        return results;
    } catch (error) {
        console.error("[Community] Search Error:", error);
        throw error;
    }
};
