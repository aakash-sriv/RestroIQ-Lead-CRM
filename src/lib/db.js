import { openDB } from 'idb';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'RestroIQ-DB';
const DB_VERSION = 1;

export async function initDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('leads')) {
                const store = db.createObjectStore('leads', { keyPath: 'leadId' });
                store.createIndex('nextFollowUpDate', 'nextFollowUpDate');
                store.createIndex('currentStatus', 'currentStatus');
                store.createIndex('leadStage', 'leadStage');
            }
            if (!db.objectStoreNames.contains('followUps')) {
                const store = db.createObjectStore('followUps', { keyPath: 'followUpId' });
                store.createIndex('leadId', 'leadId');
                store.createIndex('date', 'followUpDate');
            }
        },
    });
}

export async function getLeads() {
    const db = await initDB();
    return db.getAll('leads');
}

export async function getLead(id) {
    const db = await initDB();
    return db.get('leads', id);
}

export async function addLead(leadData) {
    const db = await initDB();
    const leadId = uuidv4();
    const newLead = {
        ...leadData,
        leadId,
        // defaults
        currentStatus: leadData.currentStatus || 'New',
        leadStage: leadData.leadStage || 'Cold',
        createdAt: new Date().toISOString(),
    };
    await db.add('leads', newLead);
    return newLead;
}

export async function updateLead(lead) {
    const db = await initDB();
    await db.put('leads', lead);
    return lead;
}

export async function getFollowUps(leadId) {
    const db = await initDB();
    const followUps = await db.getAllFromIndex('followUps', 'leadId', leadId);
    // Sort by date descending (newest first)
    return followUps.sort((a, b) => new Date(b.followUpDate) - new Date(a.followUpDate));
}

export async function addFollowUp(followUpData) {
    const db = await initDB();
    const followUpId = uuidv4();
    const now = new Date().toISOString();

    // followUpData should contain: leadId, status, notes, nextFollowUpDate (optional), leadStage (optional, for updating lead)

    const newFollowUp = {
        followUpId,
        leadId: followUpData.leadId,
        followUpDate: followUpData.followUpDate || now,
        status: followUpData.status,
        notes: followUpData.notes,
        nextFollowUpDate: followUpData.nextFollowUpDate, // Recording the generic "next step date" in history
        createdAt: now
    };

    const tx = db.transaction(['leads', 'followUps'], 'readwrite');

    // 1. Add FollowUp
    await tx.objectStore('followUps').add(newFollowUp);

    // 2. Update Lead
    const leadStore = tx.objectStore('leads');
    const lead = await leadStore.get(followUpData.leadId);

    if (lead) {
        lead.lastFollowUpDate = newFollowUp.followUpDate;
        lead.currentStatus = followUpData.status;

        if (followUpData.nextFollowUpDate) {
            lead.nextFollowUpDate = followUpData.nextFollowUpDate;
        }

        if (followUpData.leadStage) {
            lead.leadStage = followUpData.leadStage;
        }

        await leadStore.put(lead);
    }

    await tx.done;
    return newFollowUp;
}

export async function getDashboardStats() {
    const leads = await getLeads();
    const today = new Date().toISOString().split('T')[0];

    const totalLeads = leads.length;
    const callsDueToday = leads.filter(l => {
        if (!l.nextFollowUpDate) return false;
        // Simple string comparison for dates works if format is YYYY-MM-DD
        // Assuming nextFollowUpDate is YYYY-MM-DD or ISO.
        return l.nextFollowUpDate.startsWith(today) &&
            !['Converted', 'Not Interested'].includes(l.currentStatus);
    }).length;

    const cold = leads.filter(l => l.leadStage === 'Cold').length;
    const warm = leads.filter(l => l.leadStage === 'Warm').length;
    const hot = leads.filter(l => l.leadStage === 'Hot').length;
    const converted = leads.filter(l => l.currentStatus === 'Converted').length;

    return {
        totalLeads,
        callsDueToday,
        cold,
        warm,
        hot,
        converted
    };
}
