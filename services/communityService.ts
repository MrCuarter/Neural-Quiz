
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
 * Sanitizes object to remove undefined values which Firestore rejects.
 * Replaces undefined with null.
 */
const sanitizeQuizData = (data: any): any => {
    return JSON.parse(JSON.stringify(data, (key, value) => {
        return value === undefined ? null : value;
    }));
};

/**
 * Publish a Quiz to the Community
 */
export const publishQuiz = async (quiz: Quiz, finalTags: string[]): Promise<string> => {
    // 1. Authentication Check & Anonymous Fallback
    let user = auth.currentUser;
    if (!user) {
        console.log("[Community] No user found. Signing in anonymously for publication...");
        const result = await signInAnonymously(auth);
        user = result.user;
    }

    if (!user) throw new Error("Authentication failed. Cannot publish.");

    // 2. Determine Author Identity
    // Logic: If anonymous, use generic community name. If logged in, use profile.
    const isAnonymous = user.isAnonymous;
    const authorName = isAnonymous ? "Comunidad NeuralQuiz" : (user.displayName || "Usuario");
    const authorPhoto = isAnonymous ? null : (user.photoURL || null);

    // 3. Prepare Data
    const rawData = {
        title: quiz.title || "Untitled Quiz",
        description: quiz.description || "Sin descripción",
        questions: quiz.questions || [],
        tags: (finalTags || []).map(t => t.toLowerCase().trim()), // Ensure tags is array
        
        // Metadata
        authorId: user.uid,
        authorName: authorName,
        authorPhoto: authorPhoto,
        isAnonymous: isAnonymous, // Flag for future reference
        
        // Stats
        createdAt: serverTimestamp(),
        likes: 0,
        plays: 0,
        isPublic: true,
        questionCount: quiz.questions?.length || 0
    };

    // 4. Sanitize (Critical fix for "Unsupported field value: undefined")
    const publicData = sanitizeQuizData(rawData);

    try {
        const docRef = await addDoc(collection(db, PUBLIC_COLLECTION), publicData);
        console.log("[Community] Quiz Published Successfully. ID:", docRef.id);
        return docRef.id;
    } catch (error: any) {
        console.error("[Community] Publish Error:", error);
        throw new Error(`Error al publicar en la comunidad: ${error.message}`);
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
        // Don't throw here to avoid breaking UI on empty search or permission issues
        return [];
    }
};
