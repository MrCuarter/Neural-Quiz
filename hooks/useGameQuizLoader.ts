import { useState, useEffect } from 'react';
import { Quiz } from '../types';
import { DEMO_QUIZZES } from '../data/demoQuizzes';
import { getPublicQuiz } from '../services/shareService';
import { db, auth } from '../services/firebaseService';
import { doc, getDoc } from 'firebase/firestore';

interface LoaderResult {
    quiz: Quiz | null;
    loading: boolean;
    error: string | null;
}

export const useGameQuizLoader = (quizId?: string, initialQuiz?: Quiz | null): LoaderResult => {
    const [quiz, setQuiz] = useState<Quiz | null>(initialQuiz || null);
    const [loading, setLoading] = useState<boolean>(!initialQuiz && !!quizId);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // If an object is passed directly, use it and skip loading
        if (initialQuiz) {
            setQuiz(initialQuiz);
            setLoading(false);
            return;
        }

        if (!quizId) {
            setLoading(false);
            return;
        }

        const load = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // 1. DEMO CHECK
                if (quizId.startsWith('demo-')) {
                    const demo = DEMO_QUIZZES.find(d => d.id === quizId);
                    if (demo) {
                        setQuiz(demo);
                        return;
                    }
                }

                // 2. PUBLIC COLLECTION CHECK
                // We try this first as it doesn't require auth permissions usually
                const publicQ = await getPublicQuiz(quizId);
                if (publicQ) {
                    setQuiz(publicQ);
                    return;
                }

                // 3. PRIVATE/MAIN COLLECTION CHECK
                // Note: Firestore rules might block this if not the owner
                // REFACTOR: 'quizzes'
                const docRef = doc(db, "quizzes", quizId);
                const snap = await getDoc(docRef);
                
                if (snap.exists()) {
                    setQuiz({ id: snap.id, ...snap.data() } as Quiz);
                } else {
                    throw new Error("Quiz not found in database.");
                }

            } catch (err: any) {
                console.error("Quiz Loader Error:", err);
                setError(err.message || "Error loading quiz.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [quizId, initialQuiz]);

    return { quiz, loading, error };
};