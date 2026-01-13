import express from 'express';
import { supabase } from '../lib/supabaseClient.js';

const router = express.Router();

// Helper: Convert snake_case to camelCase
const toCamelCase = (lead) => ({
    leadId: lead.lead_id,
    restaurantName: lead.restaurant_name,
    phone: lead.phone,
    city: lead.city,
    currentStatus: lead.current_status,
    leadStage: lead.lead_stage,
    nextFollowUpDate: lead.next_follow_up_date,
    lastFollowUpDate: lead.last_follow_up_date,
    createdAt: lead.created_at,
    updatedAt: lead.updated_at
});

// Helper: Trim string or return null
const trimOrNull = (value) => {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
};

// GET all leads
router.get('/', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('next_follow_up_date', { ascending: true, nullsFirst: false });

        if (error) throw error;

        res.json(data.map(toCamelCase));
    } catch (error) {
        next(error);
    }
});

// GET single lead by ID
router.get('/:id', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('lead_id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Lead not found' });

        res.json(toCamelCase(data));
    } catch (error) {
        next(error);
    }
});

// POST create new lead
router.post('/', async (req, res, next) => {
    try {
        const { restaurantName, phone, city, currentStatus, leadStage, nextFollowUpDate } = req.body;

        // Validate required fields
        const errors = [];

        const trimmedRestaurantName = trimOrNull(restaurantName);
        const trimmedPhone = trimOrNull(phone);
        const trimmedCity = trimOrNull(city);

        if (!trimmedRestaurantName) {
            errors.push('restaurantName is required');
        }
        if (!trimmedPhone) {
            errors.push('phone is required');
        }
        if (!trimmedCity) {
            errors.push('city is required');
        }

        if (errors.length > 0) {
            return res.status(400).json({ error: errors.join(', ') });
        }

        const newLead = {
            restaurant_name: trimmedRestaurantName,
            phone: trimmedPhone,
            city: trimmedCity,
            current_status: trimOrNull(currentStatus) || 'New',
            lead_stage: trimOrNull(leadStage) || 'Cold',
            next_follow_up_date: nextFollowUpDate || null
        };

        const { data, error } = await supabase
            .from('leads')
            .insert([newLead])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(toCamelCase(data));
    } catch (error) {
        next(error);
    }
});

// PUT update lead
router.put('/:id', async (req, res, next) => {
    try {
        const { restaurantName, phone, city, currentStatus, leadStage, nextFollowUpDate, lastFollowUpDate } = req.body;

        // Build update object with only provided fields
        const updatedLead = {};

        if (restaurantName !== undefined) {
            const trimmed = trimOrNull(restaurantName);
            if (trimmed) updatedLead.restaurant_name = trimmed;
        }
        if (phone !== undefined) {
            const trimmed = trimOrNull(phone);
            if (trimmed) updatedLead.phone = trimmed;
        }
        if (city !== undefined) {
            const trimmed = trimOrNull(city);
            if (trimmed) updatedLead.city = trimmed;
        }
        if (currentStatus !== undefined) {
            updatedLead.current_status = currentStatus;
        }
        if (leadStage !== undefined) {
            updatedLead.lead_stage = leadStage;
        }
        if (nextFollowUpDate !== undefined) {
            updatedLead.next_follow_up_date = nextFollowUpDate || null;
        }
        if (lastFollowUpDate !== undefined) {
            updatedLead.last_follow_up_date = lastFollowUpDate || null;
        }

        // Check if there's anything to update
        if (Object.keys(updatedLead).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const { data, error } = await supabase
            .from('leads')
            .update(updatedLead)
            .eq('lead_id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Lead not found' });

        res.json(toCamelCase(data));
    } catch (error) {
        next(error);
    }
});

// DELETE lead
router.delete('/:id', async (req, res, next) => {
    try {
        // First check if lead exists
        const { data: existingLead, error: checkError } = await supabase
            .from('leads')
            .select('lead_id')
            .eq('lead_id', req.params.id)
            .single();

        if (checkError || !existingLead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Delete the lead
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('lead_id', req.params.id);

        if (error) throw error;

        res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
