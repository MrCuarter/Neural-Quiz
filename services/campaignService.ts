
import { db, auth } from "./firebaseService";
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    getDocs, 
    getDoc,
    query, 
    where, 
    serverTimestamp,
    increment,
    limit,
    onSnapshot
} from "firebase/firestore";
import { Campaign, CampaignLog, CampaignMission } from "../types";

const CAMPAIGNS_COL = "campaigns";
const LOGS_COL = "campaign_logs";

/**
 * CREATE NEW CAMPAIGN
 */
export const createCampaign = async (campaign: Omit<Campaign, 'id' | 'createdAt' | 'currentAmount' | 'publicId'>): Promise<string> => {
    const publicId = Math.random().toString(36).substring(2, 10).toUpperCase(); // Short readable ID
    
    const payload = {
        ...campaign,
        currentAmount: 0,
        publicId,
        createdAt: serverTimestamp(),
        missions: campaign.missions || []
    };

    // Clean undefined
    const cleanPayload = JSON.parse(JSON.stringify(payload));
    const docRef = await addDoc(collection(db, CAMPAIGNS_COL), cleanPayload);
    return docRef.id;
};

/**
 * GET CAMPAIGNS BY TEACHER
 */
export const getTeacherCampaigns = async (): Promise<Campaign[]> => {
    if (!auth.currentUser) return [];
    try {
        const q = query(collection(db, CAMPAIGNS_COL), where("teacherId", "==", auth.currentUser.uid));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign));
    } catch (e) {
        console.error("Error fetching campaigns", e);
        return [];
    }
};

/**
 * GET CAMPAIGN BY PUBLIC ID (For Student View)
 */
export const getCampaignByPublicId = async (publicId: string): Promise<Campaign | null> => {
    try {
        const q = query(collection(db, CAMPAIGNS_COL), where("publicId", "==", publicId.toUpperCase()), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const d = snap.docs[0];
        return { id: d.id, ...d.data() } as Campaign;
    } catch (e) {
        return null;
    }
};

/**
 * UPDATE CAMPAIGN MISSIONS
 */
export const updateCampaignMissions = async (campaignId: string, missions: CampaignMission[]) => {
    const ref = doc(db, CAMPAIGNS_COL, campaignId);
    await updateDoc(ref, { missions });
};

/**
 * INJECT EVENT (MANUAL or AUTOMATIC)
 * This adds a log entry AND updates the campaign total currency.
 */
export const injectEvent = async (
    campaignId: string, 
    amount: number, 
    message: string, 
    alias: string = 'SYSTEM', 
    action: CampaignLog['action'] = 'manual_event',
    realName?: string
) => {
    try {
        // 1. Add Log
        const logPayload: any = {
            campaignId,
            timestamp: serverTimestamp(),
            studentAlias: alias,
            action,
            amount,
            message
        };
        if (realName) logPayload.realName = realName;
        
        await addDoc(collection(db, LOGS_COL), logPayload);

        // 2. Update Campaign Total
        const campaignRef = doc(db, CAMPAIGNS_COL, campaignId);
        await updateDoc(campaignRef, {
            currentAmount: increment(amount)
        });

    } catch (e) {
        console.error("Error injecting event", e);
    }
};

/**
 * CALCULATE REWARD LOGIC
 * Base Score * Multiplier * Random(0.8 - 1.2)
 */
export const calculateReward = (baseScore: number, missionMultiplier: number): number => {
    const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
    return Math.round(baseScore * missionMultiplier * randomFactor);
};

/**
 * GET LOGS REALTIME (Hook helper)
 */
export const subscribeToLogs = (campaignId: string, callback: (logs: CampaignLog[]) => void) => {
    const q = query(
        collection(db, LOGS_COL), 
        where("campaignId", "==", campaignId), 
        // OrderBy timestamp desc requires index, sticking to client sort if needed or assume index exists
        // orderBy("timestamp", "desc"),
        limit(50)
    );
    
    return onSnapshot(q, (snap) => {
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as CampaignLog));
        // Sort client side to avoid index issues for now
        logs.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        callback(logs);
    });
};
