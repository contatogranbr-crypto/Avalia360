import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';

export interface Evaluation {
  id: string;
  evaluator_id: string;
  evaluator_name?: string;
  evaluated_id: string;
  evaluated_name?: string;
  rating?: number;
  comment?: string;
  status: 'pending' | 'completed';
  completed_at?: any;
  evaluated_role?: 'admin' | 'employee';
  evaluated_department?: string;
}

export interface User {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  department?: string;
  position?: string;
  status: 'active' | 'inactive';
}

export const useEvaluations = () => {
  const { profile, isAdmin } = useAuth();
  const [pendingEvaluations, setPendingEvaluations] = useState<any[]>([]);
  const [completedEvaluations, setCompletedEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [formQuestions, setFormQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;

    const fetchEvaluations = async () => {
      const savedUser = localStorage.getItem('auth_fallback_user');
      if (!savedUser) return;
      const parsed = JSON.parse(savedUser);

      try {
        let response;
        if (isAdmin) {
          response = await fetch('/api/admin/get-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminEmail: parsed.email,
              adminAccessKey: parsed.access_key || parsed.accessKey
            })
          });
        } else {
          response = await fetch('/api/user/get-evaluations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: parsed.email,
              accessKey: parsed.access_key || parsed.accessKey
            })
          });
        }

        const data = await response.json();
        if (data.success) {
          const evals = data.evaluations as Evaluation[];
          setPendingEvaluations(evals.filter((e: any) => e.status === 'pending'));
          setCompletedEvaluations(evals.filter((e: any) => e.status === 'completed'));
          if (isAdmin && data.users) {
            setUsers(data.users as User[]);
          }
          if (data.forms) {
            setForms(data.forms);
          }
          if (data.form_questions) {
            setFormQuestions(data.form_questions);
          }
        } else {
          console.error("API Error:", data.error);
        }
      } catch (error) {
        console.error("Error fetching evaluations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();

    // Real-time subscription for evaluations
    const channel = supabase
      .channel('evaluations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evaluations' }, () => {
        fetchEvaluations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, isAdmin]);

  return { pendingEvaluations, completedEvaluations, loading, users, forms, formQuestions };
};
