export interface User {
  id: string; // from auth
  uid: string; // application id
  name: string;
  email: string;
  role: 'admin' | 'employee' | 'client';
  department?: string;
  access_key: string;
  status: string;
  photo_url?: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  protocol: string;
  type: 'reclamacao' | 'sugestao' | 'elogio' | 'denuncia';
  subject: string;
  description: string;
  status: 'pendente' | 'em_analise' | 'resolvido' | 'arquivado';
  response?: string;
  is_anonymous: boolean;
  user_id?: string;
  contact_email?: string;
  created_at: string;
  updated_at: string;
}

export interface FormQuestion {
  id?: string;
  form_id?: string;
  question_text: string;
  question_type: 'short_text' | 'paragraph' | 'multiple_choice' | 'checkboxes' | 'dropdown' | 'linear_scale' | 'rating';
  options?: any; // For choices: string[], for scale: { min: 1, max: 5, minLabel: '', maxLabel: '' }
  required: boolean;
  category?: string;
  order_index?: number;
  created_at?: string;
}

export interface Form {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

export interface Evaluation {
  id: string;
  evaluator_id: string;
  evaluator_name: string;
  evaluated_id: string;
  evaluated_name: string;
  status: 'pending' | 'completed';
  form_id?: string | null;
  rating?: number;
  comment?: string;
  answers?: any; // JSON object mapping question_id -> answer
  completed_at?: string;
  created_at: string;
  evaluated_role?: string;
  evaluated_department?: string;
  evaluated_photo_url?: string;
}
