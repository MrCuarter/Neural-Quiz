
import { db } from "./firebaseService";
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    getDocs, 
    query, 
    where, 
    serverTimestamp,
    runTransaction,
    limit
} from "firebase/firestore";
import { RaceSession, RaceTeamColor, RacePowerUp } from "../types";

const SESSIONS_COL = "race_sessions";

// Generate 6 digit pin
const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * CREATE RACE SESSION
 * Initializes the 4 teams and session state.
 */
export const createRaceSession = async (quizId: string, quizTitle: string, hostId: string): Promise<string> => {
    const pin = generatePin();
    
    const initialTeams: Record<RaceTeamColor, any> = {
        red: { score: 0, members: [], activeEffects: [] },
        blue: { score: 0, members: [], activeEffects: [] },
        green: { score: 0, members: [], activeEffects: [] },
        yellow: { score: 0, members: [], activeEffects: [] }
    };

    const sessionData: Omit<RaceSession, 'id'> = {
        pin,
        status: 'waiting',
        hostId,
        quizId,
        quizTitle,
        currentQuestionIndex: 0,
        teams: initialTeams,
        players: {},
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, SESSIONS_COL), sessionData);
    return docRef.id;
};

/**
 * JOIN RACE
 * Finds session by PIN, balances teams, adds player.
 */
export const joinRace = async (pin: string, playerName: string): Promise<{ sessionId: string, playerId: string, team: RaceTeamColor } | null> => {
    // 1. Find Session
    const q = query(collection(db, SESSIONS_COL), where("pin", "==", pin), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) throw new Error("PIN no válido");
    
    const sessionDoc = snapshot.docs[0];
    const sessionId = sessionDoc.id;
    const session = sessionDoc.data() as RaceSession;

    if (session.status !== 'waiting') throw new Error("La carrera ya ha empezado o terminado.");

    // 2. Transaction to add player and balance teams
    const sessionRef = doc(db, SESSIONS_COL, sessionId);
    
    return await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(sessionRef);
        if (!sfDoc.exists()) throw new Error("Sesión no encontrada");
        
        const data = sfDoc.data() as RaceSession;
        
        // Find smallest team
        const teamCounts: Record<RaceTeamColor, number> = {
            red: data.teams.red.members.length,
            blue: data.teams.blue.members.length,
            green: data.teams.green.members.length,
            yellow: data.teams.yellow.members.length
        };
        
        // Sort by count asc
        const sortedTeams = (Object.keys(teamCounts) as RaceTeamColor[]).sort((a, b) => teamCounts[a] - teamCounts[b]);
        const assignedTeam = sortedTeams[0]; // Pick smallest

        const playerId = Math.random().toString(36).substring(2, 10);
        
        // Update paths
        const newPlayer = {
            id: playerId,
            name: playerName.toUpperCase().slice(0, 12),
            team: assignedTeam,
            streak: 0,
            inventory: null
        };

        const updatedTeams = { ...data.teams };
        updatedTeams[assignedTeam].members.push(playerId);
        
        const updatedPlayers = { ...data.players, [playerId]: newPlayer };

        transaction.update(sessionRef, {
            teams: updatedTeams,
            players: updatedPlayers
        });

        return { sessionId, playerId, team: assignedTeam };
    });
};

/**
 * START RACE
 */
export const startRace = async (sessionId: string) => {
    await updateDoc(doc(db, SESSIONS_COL, sessionId), { status: 'racing' });
};

/**
 * SUBMIT ANSWER
 * Handles scoring, streaks and powerup granting.
 */
export const submitAnswer = async (sessionId: string, playerId: string, isCorrect: boolean) => {
    const sessionRef = doc(db, SESSIONS_COL, sessionId);

    await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(sessionRef);
        if (!sfDoc.exists()) return;
        
        const data = sfDoc.data() as RaceSession;
        const player = data.players[playerId];
        if (!player) return;

        const teamColor = player.team;
        const team = data.teams[teamColor];

        // Check for 'freeze' effect on team
        const isFrozen = team.activeEffects.some(e => e.type === 'freeze' && e.expiresAt > Date.now());

        let scoreDelta = 0;
        let newStreak = player.streak;
        let newInventory = player.inventory;

        if (isCorrect) {
            scoreDelta = isFrozen ? 0 : 5; // Base score
            newStreak += 1;
            
            // Check for 'boost' effect on team (Double score)
            const isBoosted = team.activeEffects.some(e => e.type === 'boost' && e.expiresAt > Date.now());
            if (isBoosted) scoreDelta *= 2;

            // Grant PowerUp every 3 streaks
            if (newStreak % 3 === 0 && !newInventory) {
                const powers: RacePowerUp[] = ['boost', 'shield', 'freeze', 'swap'];
                newInventory = powers[Math.floor(Math.random() * powers.length)];
            }
        } else {
            newStreak = 0;
            // Optional: Small penalty?
        }

        // Apply updates
        const updatedTeams = { ...data.teams };
        updatedTeams[teamColor].score = Math.min(100, updatedTeams[teamColor].score + scoreDelta);

        const updatedPlayers = { 
            ...data.players, 
            [playerId]: { ...player, streak: newStreak, inventory: newInventory } 
        };

        transaction.update(sessionRef, {
            teams: updatedTeams,
            players: updatedPlayers
        });
    });
};

/**
 * USE POWER UP
 */
export const usePowerUp = async (sessionId: string, playerId: string, targetTeam: RaceTeamColor) => {
    const sessionRef = doc(db, SESSIONS_COL, sessionId);

    await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(sessionRef);
        if (!sfDoc.exists()) return;
        const data = sfDoc.data() as RaceSession;
        const player = data.players[playerId];
        
        if (!player || !player.inventory) return;

        const type = player.inventory;
        const myTeamColor = player.team;
        const updatedTeams = { ...data.teams };
        const now = Date.now();

        // Apply Logic
        if (type === 'boost') {
            // Self Team Boost (10s)
            updatedTeams[myTeamColor].activeEffects.push({ type: 'boost', expiresAt: now + 10000 });
        } else if (type === 'shield') {
            // Self Team Shield (15s)
            updatedTeams[myTeamColor].activeEffects.push({ type: 'shield', expiresAt: now + 15000 });
        } else if (type === 'freeze') {
            // Target Team Freeze (5s) - Check shield
            const target = updatedTeams[targetTeam];
            const isShielded = target.activeEffects.some(e => e.type === 'shield' && e.expiresAt > now);
            if (!isShielded) {
                target.activeEffects.push({ type: 'freeze', expiresAt: now + 5000 });
            }
        } else if (type === 'swap') {
            // Swap Scores with Target - Check shield
            const target = updatedTeams[targetTeam];
            const isShielded = target.activeEffects.some(e => e.type === 'shield' && e.expiresAt > now);
            if (!isShielded) {
                const temp = updatedTeams[myTeamColor].score;
                updatedTeams[myTeamColor].score = target.score;
                target.score = temp;
            }
        }

        // Consume Item
        const updatedPlayers = { 
            ...data.players, 
            [playerId]: { ...player, inventory: null } 
        };

        transaction.update(sessionRef, {
            teams: updatedTeams,
            players: updatedPlayers
        });
    });
};
