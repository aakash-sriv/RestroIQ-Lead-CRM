import express from 'express';
import { supabase } from '../lib/supabaseClient.js';

const router = express.Router();

// Helper: Get today's date in local timezone (YYYY-MM-DD format)
const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// GET dashboard statistics
router.get('/stats', async (req, res, next) => {
    try {
        const { data: leads, error } = await supabase
            .from('leads')
            .select('*');

        if (error) throw error;

        // Use local timezone for date comparison
        const today = getLocalDateString(new Date());

        const totalLeads = leads.length;
        const callsDueToday = leads.filter(l => {
            if (!l.next_follow_up_date) return false;
            // Parse the follow-up date and get local date string
            const followUpDate = getLocalDateString(new Date(l.next_follow_up_date));
            return followUpDate === today &&
                !['Converted', 'Not Interested'].includes(l.current_status);
        }).length;

        const cold = leads.filter(l => l.lead_stage === 'Cold').length;
        const warm = leads.filter(l => l.lead_stage === 'Warm').length;
        const hot = leads.filter(l => l.lead_stage === 'Hot').length;
        const converted = leads.filter(l => l.current_status === 'Converted').length;

        res.json({
            totalLeads,
            callsDueToday,
            cold,
            warm,
            hot,
            converted
        });
    } catch (error) {
        next(error);
    }
});

export default router;
