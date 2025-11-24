import { supabase } from '../lib/supabase';

// Checklists
export const checklistService = {
    async getAll() {
        const { data, error } = await supabase
            .from('checklists')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getById(id) {
        const { data, error } = await supabase
            .from('checklists')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async create(checklistData) {
        const { data, error } = await supabase
            .from('checklists')
            .insert([checklistData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id, checklistData) {
        const { data, error } = await supabase
            .from('checklists')
            .update(checklistData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { error } = await supabase
            .from('checklists')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};

// Submissions
export const submissionService = {
    async submit(checklistId, answers, userId) {
        const pointsEarned = 10 + Object.keys(answers).length;

        const { data: submission, error } = await supabase
            .from('submissions')
            .insert([{
                checklist_id: checklistId,
                user_id: userId,
                answers,
                points_earned: pointsEarned,
                status: 'completed'
            }])
            .select()
            .single();

        if (error) throw error;

        // Update user points
        const { error: pointsError } = await supabase.rpc('increment_user_points', {
            user_id: userId,
            points: pointsEarned
        });

        if (pointsError) console.error('Error updating points:', pointsError);

        return { ...submission, pointsEarned };
    },

    async getByUser(userId) {
        const { data, error } = await supabase
            .from('submissions')
            .select(`
                *,
                checklists (title)
            `)
            .eq('user_id', userId)
            .order('submitted_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getAll() {
        const { data, error } = await supabase
            .from('submissions')
            .select(`
                *,
                checklists (title),
                profiles (name)
            `)
            .order('submitted_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data;
    }
};

// Team / Profiles
export const teamService = {
    async getAll() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('points', { ascending: false });

        if (error) throw error;
        return data;
    },

    async updateProfile(userId, updates) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

// Dashboard
export const dashboardService = {
    async getStats() {
        // Get total checklists
        const { count: totalChecklists } = await supabase
            .from('checklists')
            .select('*', { count: 'exact', head: true });

        // Get submissions today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: completedToday } = await supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .gte('submitted_at', today.toISOString());

        // Get team members count
        const { count: teamMembers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        return {
            activeChecklists: totalChecklists || 0,
            completedToday: completedToday || 0,
            teamMembers: teamMembers || 0,
            efficiency: '94%'
        };
    },

    async getRecentActivity() {
        const { data, error } = await supabase
            .from('submissions')
            .select(`
                id,
                submitted_at,
                status,
                profiles!inner (name),
                checklists!inner (title)
            `)
            .order('submitted_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        return data.map(item => ({
            id: item.id,
            user_name: item.profiles.name,
            checklist_title: item.checklists.title,
            submitted_at: item.submitted_at,
            status: item.status
        }));
    }
};
