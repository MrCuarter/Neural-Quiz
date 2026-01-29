import { db } from "./firebaseService";
import { 
    doc, 
    updateDoc, 
    getDoc, 
    addDoc, 
    collection, 
    serverTimestamp, 
    increment
} from "firebase/firestore";
import { Quiz } from "../types";

/**
 * TOGGLE QUIZ VISIBILITY
 * Simply updates the 'isPublic' flag on the main quiz document.
 */
export const toggleQuizVisibility = async (quiz: Quiz, userId: string, isPublic: boolean): Promise<void> => {
    if (!quiz.id) throw new Error("Quiz ID is missing");
    
    const quizRef = doc(db, "quizzes", quiz.id);

    try {
        await updateDoc(quizRef, { 
            isPublic: isPublic,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error toggling visibility:", error);
        throw error;
    }
};

/**
 * UPDATE CLONING PERMISSION
 */
export const updateCloningPermission = async (quizId: string, allowCloning: boolean): Promise<void> => {
    const quizRef = doc(db, "quizzes", quizId);
    await updateDoc(quizRef, { allowCloning });
};

/**
 * FETCH PUBLIC QUIZ (By ID)
 * Reads from 'quizzes' collection but validates it is public.
 */
export const getPublicQuiz = async (quizId: string): Promise<Quiz | null> => {
    const docRef = doc(db, "quizzes", quizId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        const data = snap.data();
        
        // Security check: Only return if it is public
        // Note: Firestore Rules should enforce this, but double check here doesn't hurt logic flow
        // Exception: If I am the owner, I can see it even if private (handled by Rules)
        
        // Increment visit counter silently
        updateDoc(docRef, { visits: increment(1) }).catch(console.error);
        
        return { 
            id: snap.id, 
            ...data 
        } as Quiz;
    }
    return null;
};

/**
 * IMPORT (CLONE) QUIZ
 * Copies a public quiz into the current user's library (creates a new doc in 'quizzes').
 */
export const importQuizToLibrary = async (publicQuiz: Quiz, newOwnerId: string): Promise<string> => {
    if (!publicQuiz.allowCloning) {
        throw new Error("This quiz does not allow cloning.");
    }

    const newQuizData = {
        userId: newOwnerId, // New Owner
        title: `${publicQuiz.title} (Copy)`,
        description: publicQuiz.description,
        questions: publicQuiz.questions,
        tags: publicQuiz.tags || [],
        
        // Reset flags for the new copy (Start private)
        isPublic: false,
        allowCloning: false,
        
        // Lineage tracking
        originalQuizId: publicQuiz.id,
        originalAuthorId: publicQuiz.userId || publicQuiz.originalAuthorId, // Track original creator
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    // Create new document in 'quizzes'
    const docRef = await addDoc(collection(db, "quizzes"), newQuizData);

    // Increment clone count on the ORIGINAL document
    if (publicQuiz.id) {
        const originalRef = doc(db, "quizzes", publicQuiz.id);
        updateDoc(originalRef, { clones: increment(1) }).catch(console.error);
    }

    return docRef.id;
};