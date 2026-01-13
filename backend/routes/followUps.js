import express from 'express';
import { supabase } from '../lib/supabaseClient.js';

const router = express.Router();

// Helper: Convert snake_case to camelCase
const toCamelCase = (followUp) => ({
    followUpId: followUp.follow_up_id,
    leadId: followUp.lead_id,
    followUpDate: followUp.follow_up_date,
    status: followUp.status,
    notes: followUp.notes,
    nextFollowUpDate: followUp.next_follow_up_date,
    createdAt: followUp.created_at
});

// GET all follow-ups for a lead
router.get('/lead/:leadId', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('follow_ups')
            .select('*')
            .eq('lead_id', req.params.leadId)
            .order('follow_up_date', { ascending: false });

        if (error) throw error;

        res.json(data.map(toCamelCase));
    } catch (error) {
        next(error);
    }
});

// POST create follow-up and update lead
router.post('/', async (req, res, next) => {
    try {
        const { leadId, followUpDate, status, notes, nextFollowUpDate, leadStage } = req.body;

        // Validate required fields
        if (!leadId) {
            return res.status(400).json({ error: 'leadId is required' });
        }
        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }

        // Check if lead exists before creating follow-up
        const { data: existingLead, error: leadCheckError } = await supabase
            .from('leads')
            .select('lead_id')
            .eq('lead_id', leadId)
            .single();

        if (leadCheckError || !existingLead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const now = new Date().toISOString();

        const newFollowUp = {
            lead_id: leadId,
            follow_up_date: followUpDate || now,
            status: status,
            notes: notes || null,
            next_follow_up_date: nextFollowUpDate || null
        };

        // Build lead update object
        const leadUpdate = {
            last_follow_up_date: newFollowUp.follow_up_date,
            current_status: status
        };

        if (nextFollowUpDate) {
            leadUpdate.next_follow_up_date = nextFollowUpDate;
        }

        if (leadStage) {
            leadUpdate.lead_stage = leadStage;
        }

        // Insert follow-up
        const { data: followUpResult, error: followUpError } = await supabase
            .from('follow_ups')
            .insert([newFollowUp])
            .select()
            .single();

        if (followUpError) throw followUpError;

        // Update the lead
        const { error: leadError } = await supabase
            .from('leads')
            .update(leadUpdate)
            .eq('lead_id', leadId);

        if (leadError) {
            // Log error but still return the follow-up since it was created
            console.error('Error updating lead after follow-up:', leadError);
        }

        res.status(201).json(toCamelCase(followUpResult));
    } catch (error) {
        next(error);
    }
});

export default router;
