
import { db } from "./firebaseService";
import { 
    doc, 
    setDoc, 
    deleteDoc, 
    getDoc, 
    addDoc, 
    collection, 
    serverTimestamp,
    updateDoc,
    increment
} from "firebase/firestore";
import { Quiz } from "../types";

/**
 * TOGGLE QUIZ VISIBILITY
 * Manages the presence of a quiz in the global 'public_quizzes' collection.
 */
export const toggleQuizVisibility = async (quiz: Quiz, userId: string, isPublic: boolean): Promise<void> => {
    if (!quiz.id) throw new Error("Quiz ID is missing");
    
    const userQuizRef = doc(db, "quizes", quiz.id);
    const publicQuizRef = doc(db, "public_quizzes", quiz.id); // Use same ID for 1:1 mapping

    try {
        // 1. Update the local User Copy first
        await updateDoc(userQuizRef, { isPublic });

        // 2. Handle Public Collection
        if (isPublic) {
            // PUBLISH: Create/Overwrite doc in public_quizzes
            // We sanitize to ensure only necessary data is public
            const publicData = {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description || "",
                questions: quiz.questions,
                tags: quiz.tags || [],
                originalAuthorId: userId,
                authorName: quiz.authorName || "Anonymous Teacher", // Should be passed or fetched
                allowCloning: quiz.allowCloning || false,
                updatedAt: serverTimestamp(),
                clones: quiz.clones || 0,
                visits: quiz.visits || 0
            };
            await setDoc(publicQuizRef, publicData, { merge: true });
        } else {
            // UNPUBLISH: Delete from public_quizzes
            await deleteDoc(publicQuizRef);
        }
    } catch (error) {
        console.error("Error toggling visibility:", error);
        throw error;
    }
};

/**
 * UPDATE CLONING PERMISSION
 */
export const updateCloningPermission = async (quizId: string, allowCloning: boolean): Promise<void> => {
    const userQuizRef = doc(db, "quizes", quizId);
    const publicQuizRef = doc(db, "public_quizzes", quizId);

    // Update both places to stay in sync
    await updateDoc(userQuizRef, { allowCloning });
    
    // Check if it exists in public before updating
    const publicSnap = await getDoc(publicQuizRef);
    if (publicSnap.exists()) {
        await updateDoc(publicQuizRef, { allowCloning });
    }
};

/**
 * FETCH PUBLIC QUIZ
 * Used for the landing page /share/:id
 */
export const getPublicQuiz = async (quizId: string): Promise<Quiz | null> => {
    const docRef = doc(db, "public_quizzes", quizId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        // Increment visit counter silently
        updateDoc(docRef, { visits: increment(1) }).catch(console.error);
        return { id: snap.id, ...snap.data() } as Quiz;
    }
    return null;
};

/**
 * IMPORT (CLONE) QUIZ
 * Copies a public quiz into the current user's library.
 */
export const importQuizToLibrary = async (publicQuiz: Quiz, newOwnerId: string): Promise<string> => {
    if (!publicQuiz.allowCloning) {
        throw new Error("This quiz does not allow cloning.");
    }

    const newQuizData = {
        userId: newOwnerId,
        title: `${publicQuiz.title} (Copy)`,
        description: publicQuiz.description,
        questions: publicQuiz.questions,
        tags: publicQuiz.tags || [],
        
        // Reset flags for the new copy
        isPublic: false,
        allowCloning: false,
        
        // Lineage
        originalQuizId: publicQuiz.id,
        originalAuthorId: publicQuiz.originalAuthorId,
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    // 1. Create in user's library
    const docRef = await addDoc(collection(db, "quizes"), newQuizData);

    // 2. Increment clone count on public doc
    if (publicQuiz.id) {
        const publicRef = doc(db, "public_quizzes", publicQuiz.id);
        updateDoc(publicRef, { clones: increment(1) }).catch(console.error);
    }

    return docRef.id;
};
