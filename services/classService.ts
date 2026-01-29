
import { db, auth } from "./firebaseService";
import { 
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
    serverTimestamp 
} from "firebase/firestore";
import { ClassGroup } from "../types";

const COLLECTION_NAME = "classes";

/**
 * Create a new Class Group
 */
export const createClassGroup = async (name: string, students: string[]): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in to create a class");

    const classData: Omit<ClassGroup, 'id'> = {
        teacherId: user.uid,
        name: name.trim(),
        students: students.map(s => s.trim()).filter(s => s.length > 0),
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), classData);
    return docRef.id;
};

/**
 * Get all classes for the current teacher
 */
export const getTeacherClasses = async (): Promise<ClassGroup[]> => {
    const user = auth.currentUser;
    if (!user) return [];

    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("teacherId", "==", user.uid),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassGroup));
    } catch (e: any) {
        console.error("Error fetching classes:", e);
        // Fallback for missing index
        if (e.code === 'failed-precondition') {
            const qSimple = query(collection(db, COLLECTION_NAME), where("teacherId", "==", user.uid));
            const snapshot = await getDocs(qSimple);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassGroup));
        }
        return [];
    }
};

/**
 * Get a specific class by ID (Public read for students if they have the ID via evaluation)
 * Note: Firestore rules must allow reading class if student has ID, or we use Cloud Function.
 * For now, we assume simple read.
 */
export const getClassById = async (classId: string): Promise<ClassGroup | null> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, classId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() } as ClassGroup;
        }
        return null;
    } catch (e) {
        console.error("Error fetching class:", e);
        return null;
    }
};

/**
 * Update a Class Group
 */
export const updateClassGroup = async (classId: string, name: string, students: string[]) => {
    const docRef = doc(db, COLLECTION_NAME, classId);
    await updateDoc(docRef, {
        name: name.trim(),
        students: students.map(s => s.trim()).filter(s => s.length > 0)
    });
};

/**
 * Delete a Class Group
 */
export const deleteClassGroup = async (classId: string) => {
    await deleteDoc(doc(db, COLLECTION_NAME, classId));
};
