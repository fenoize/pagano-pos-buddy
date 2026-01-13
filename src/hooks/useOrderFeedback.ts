import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrderFeedback {
  id: string;
  order_id: string;
  customer_id: string;
  rating: 'positive' | 'negative';
  comment?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
  // Joined data
  order?: {
    id: string;
    order_number: number;
    total: number;
    created_at: string;
    fulfillment: string;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  reviewer?: {
    id: string;
    username: string;
  };
}

export interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  pending_review: number;
  satisfaction_rate: number;
}

// Helper to determine if feedback requires review
// Positive without comment = auto-reviewed (no action needed)
// Negative or positive with comment = requires review
export function feedbackRequiresReview(f: { rating: string; comment?: string | null; reviewed_at?: string | null }): boolean {
  if (f.reviewed_at) return false; // Already reviewed
  if (f.rating === 'negative') return true; // Negative always requires review
  if (f.rating === 'positive' && f.comment) return true; // Positive with comment requires review
  return false; // Positive without comment = auto-reviewed
}

export interface FeedbackFilters {
  rating?: 'positive' | 'negative' | 'all';
  reviewed?: 'pending' | 'reviewed' | 'all';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function useOrderFeedback() {
  const [loading, setLoading] = useState(false);

  // Submit feedback (for customers)
  const submitFeedback = async (
    orderId: string,
    customerId: string,
    rating: 'positive' | 'negative',
    comment?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('order_feedback')
        .insert({
          order_id: orderId,
          customer_id: customerId,
          rating,
          comment: comment?.trim() || null
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Ya calificaste este pedido');
        } else {
          throw error;
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Error al enviar calificación');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Check if feedback exists for an order
  const getFeedbackForOrder = async (orderId: string): Promise<OrderFeedback | null> => {
    try {
      const { data, error } = await supabase
        .from('order_feedback')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (error) throw error;
      return data as OrderFeedback | null;
    } catch (error) {
      console.error('Error fetching feedback:', error);
      return null;
    }
  };

  // Get all feedback with filters (for staff)
  const getAllFeedback = async (
    filters: FeedbackFilters = {},
    page = 1,
    limit = 20
  ): Promise<{ data: OrderFeedback[]; count: number }> => {
    setLoading(true);
    try {
      let query = supabase
        .from('order_feedback')
        .select(`
          *,
          order:orders!inner(id, order_number, total, created_at, fulfillment),
          customer:customers!inner(id, name, phone, email),
          reviewer:users(id, username)
        `, { count: 'exact' });

      // Apply filters
      if (filters.rating && filters.rating !== 'all') {
        query = query.eq('rating', filters.rating);
      }

      if (filters.reviewed === 'pending') {
        query = query.is('reviewed_at', null);
      } else if (filters.reviewed === 'reviewed') {
        query = query.not('reviewed_at', 'is', null);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      // Pagination
      const from = (page - 1) * limit;
      query = query
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: (data || []) as OrderFeedback[],
        count: count || 0
      };
    } catch (error) {
      console.error('Error fetching all feedback:', error);
      toast.error('Error al cargar calificaciones');
      return { data: [], count: 0 };
    } finally {
      setLoading(false);
    }
  };

  // Get feedback statistics
  const getFeedbackStats = async (): Promise<FeedbackStats> => {
    try {
      const { data, error } = await supabase
        .from('order_feedback')
        .select('rating, comment, reviewed_at');

      if (error) throw error;

      const total = data?.length || 0;
      const positive = data?.filter(f => f.rating === 'positive').length || 0;
      const negative = data?.filter(f => f.rating === 'negative').length || 0;
      // Pending = negative without review OR positive with comment without review
      const pending_review = data?.filter(f => feedbackRequiresReview(f)).length || 0;
      const satisfaction_rate = total > 0 ? Math.round((positive / total) * 100) : 0;

      return { total, positive, negative, pending_review, satisfaction_rate };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return { total: 0, positive: 0, negative: 0, pending_review: 0, satisfaction_rate: 0 };
    }
  };

  // Mark feedback as reviewed (for staff)
  const markAsReviewed = async (
    feedbackId: string,
    reviewedBy: string,
    notes?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('order_feedback')
        .update({
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
          review_notes: notes?.trim() || null
        })
        .eq('id', feedbackId);

      if (error) throw error;

      toast.success('Feedback marcado como revisado');
      return true;
    } catch (error) {
      console.error('Error marking as reviewed:', error);
      toast.error('Error al marcar como revisado');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    submitFeedback,
    getFeedbackForOrder,
    getAllFeedback,
    getFeedbackStats,
    markAsReviewed
  };
}
