import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, ClipboardList, CheckCircle2, AlertCircle, UserPlus, 
  BarChart3, TrendingUp, Lock, Pencil, Mail, ShieldAlert, 
  MessageSquare, Trash2, Copy, ExternalLink, Star, RefreshCw, 
  Settings, Calendar, Send, Search, Filter, Layers, FileText, 
  SendHorizontal, Camera, Upload, Download, FileDown, Eye,
  Paperclip, X, ImageIcon, FileIcon, FilmIcon, Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createEmployeeAccount, updateEmployeeProfile, deleteEmployeeAccount } from '../services';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TriggerCycleDialog } from './TriggerCycleDialog';
import { FormBuilder } from './FormBuilder';
import { Form, FormQuestion } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { uploadOmbudsmanFile, respondToComplaint } from '../services';

interface AttachmentDisplayProps {
  url: string;
}

const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({ url }) => {
  const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)/i);
  const isVideo = url.match(/\.(mp4|webm|mov)/i);
  const isPDF = url.match(/\.pdf/i);

  if (isImage) {
    return (
      <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 bg-white max-w-[200px]">
        <img src={url} alt="Anexo" className="w-full h-auto cursor-pointer" onClick={() => window.open(url, '_blank')} />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 bg-white max-w-[200px]">
        <video src={url} controls className="w-full h-auto" />
      </div>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="mt-2 gap-2 text-[10px] h-8"
      onClick={() => window.open(url, '_blank')}
    >
      {isPDF ? <FileIcon className="w-3.5 h-3.5 text-red-500" /> : <Paperclip className="w-3.5 h-3.5" />}
      Ver Documento
      <Download className="w-3 h-3 ml-1" />
    </Button>
  );
};

export const AdminDashboard = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'employee', department: '', position: '', password: '', photo_url: '' });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [isRespondingComplaint, setIsRespondingComplaint] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [complaintStatus, setComplaintStatus] = useState('');
  const [selectedAdminFiles, setSelectedAdminFiles] = useState<File[]>([]);
  const [isUploadingAdminFiles, setIsUploadingAdminFiles] = useState(false);

  const handleImageUpload = async (file: File, isEditing = false) => {
    try {
      setUploading(true);

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Get current admin credentials from localStorage
      const savedUser = localStorage.getItem('auth_fallback_user');
      if (!savedUser) throw new Error('Usuário não autenticado');
      const parsed = JSON.parse(savedUser);

      // Upload via server (uses service role key, bypasses RLS)
      const response = await fetch('/api/admin/upload-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileBase64: base64,
          adminEmail: parsed.email,
          adminAccessKey: parsed.access_key || parsed.accessKey
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      const publicUrl = data.url;

      if (isEditing) {
        setEditingUser((prev: any) => ({ ...prev, photo_url: publicUrl }));
      } else {
        setNewUser(prev => ({ ...prev, photo_url: publicUrl }));
      }

      toast.success('Imagem carregada com sucesso!');
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao subir imagem: ' + error.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  
  // New states for Advanced Features
  const [settings, setSettings] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [evaluationFrequency, setEvaluationFrequency] = useState('90');
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEvalForDetail, setSelectedEvalForDetail] = useState<any>(null);
  const [isEvalDetailOpen, setIsEvalDetailOpen] = useState(false);
  const [isTriggerCycleOpen, setIsTriggerCycleOpen] = useState(false);
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);
  const [forms, setForms] = useState<Form[]>([]);
  const [questionsMap, setQuestionsMap] = useState<Record<string, FormQuestion[]>>({});
  
  // Log Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [evaluatorFilter, setEvaluatorFilter] = useState('all');
  const [evaluatedFilter, setEvaluatedFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [formFilter, setFormFilter] = useState('all');
  const [selectedFormIdForCycle, setSelectedFormIdForCycle] = useState<string | undefined>(undefined);

  // Complaint Filters
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('all');
  const [complaintTypeFilter, setComplaintTypeFilter] = useState('all');
  const [complaintSearchTerm, setComplaintSearchTerm] = useState('');

  const fetchData = async () => {
    const savedUser = localStorage.getItem('auth_fallback_user');
    if (!savedUser) return;
    
    const parsed = JSON.parse(savedUser);
    
    try {
      console.log("[AdminDashboard] Fetching data from: /api/admin/get-data");
      const response = await fetch('/api/admin/get-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: parsed.email,
          adminAccessKey: parsed.access_key || parsed.accessKey
        })
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`[AdminDashboard] Admin data fetch failed (${response.status}):`, text);
        try {
          const errorData = JSON.parse(text);
          toast.error(`Erro: ${errorData.error || 'Falha ao carregar dados'}`);
          console.error("[AdminDashboard] Error details:", errorData);
        } catch (e) {
          toast.error(`Erro do servidor (${response.status}). Verifique os logs.`);
        }
        return;
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.users || []);
        setEvaluations(data.evaluations || []);
        setSettings(data.settings || []);
        
        // Update frequency from settings
        const freq = data.settings?.find((s: any) => s.key === 'evaluation_frequency');
        if (freq) setEvaluationFrequency(freq.value);
      }

      // Fetch Forms separately
      const formsResponse = await fetch('/api/admin/get-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: parsed.email,
          adminAccessKey: parsed.access_key || parsed.accessKey
        })
      });
      const formsData = await formsResponse.json();
      if (formsData.success) {
        setForms(formsData.forms || []);
        
        // Group questions by form
        const qMap: Record<string, FormQuestion[]> = {};
        (formsData.questions || []).forEach((q: FormQuestion) => {
          if (!qMap[q.form_id!]) qMap[q.form_id!] = [];
          qMap[q.form_id!].push(q);
        });
        setQuestionsMap(qMap);
      }

      // Fetch Complaints
      const complaintsResponse = await fetch('/api/admin/get-complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: parsed.email,
          adminAccessKey: parsed.access_key || parsed.accessKey
        })
      });
      const complaintsData = await complaintsResponse.json();
      if (complaintsData.success) {
        setComplaints(complaintsData.complaints || []);
      }

    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  };

  const handleUpdateSettings = async (newFreq: string) => {
    const savedUser = localStorage.getItem('auth_fallback_user');
    if (!savedUser) return;
    const parsed = JSON.parse(savedUser);

    try {
      setLoading(true);
      const response = await fetch('/api/admin/update-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { evaluation_frequency: newFreq },
          adminEmail: parsed.email,
          adminAccessKey: parsed.access_key || parsed.accessKey
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Configurações atualizadas');
        fetchData();
      } else throw new Error(data.error);
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCycleLegacy = async (includeSelf: boolean = false) => {
    const savedUser = localStorage.getItem('auth_fallback_user');
    if (!savedUser) return;
    const parsed = JSON.parse(savedUser);

    try {
      const response = await fetch('/api/admin/trigger-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeSelf,
          adminEmail: parsed.email,
          adminAccessKey: parsed.access_key || parsed.accessKey
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        fetchData();
      } else throw new Error(data.error);
    } catch (error: any) {
      toast.error('Erro ao iniciar ciclo: ' + error.message);
      throw error;
    }
  };

  const handleTriggerCycleCustom = async (payload: { formId: string; evaluatorIds: string[]; evaluatedIds: string[] }) => {
    const savedUser = localStorage.getItem('auth_fallback_user');
    if (!savedUser) return;
    const parsed = JSON.parse(savedUser);

    try {
      const response = await fetch('/api/admin/trigger-cycle-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          adminEmail: parsed.email,
          adminAccessKey: parsed.access_key || parsed.accessKey
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        fetchData();
      } else throw new Error(data.error);
    } catch (error: any) {
      toast.error('Erro ao iniciar ciclo: ' + error.message);
      throw error;
    }
  };

  const handleTriggerActivitiesMapping = async () => {
    const savedUser = localStorage.getItem('auth_fallback_user');
    if (!savedUser) return;
    const parsed = JSON.parse(savedUser);

    try {
      setLoading(true);
      const response = await fetch('/api/admin/trigger-activities-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: parsed.email,
          adminAccessKey: parsed.access_key || parsed.accessKey
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        fetchData();
      } else throw new Error(data.error);
    } catch (error: any) {
      toast.error('Erro ao enviar mapeamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = async (formPayload: { title: string; description: string; questions: FormQuestion[] }) => {
    const savedUser = localStorage.getItem('auth_fallback_user');
    if (!savedUser) return;
    const parsed = JSON.parse(savedUser);

    try {
      const response = await fetch('/api/admin/create-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formPayload,
          adminEmail: parsed.email,
          adminAccessKey: parsed.access_key || parsed.accessKey
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Formulário criado com sucesso!');
        setIsFormBuilderOpen(false);
        fetchData();
      } else throw new Error(data.error);
    } catch (error: any) {
      toast.error('Erro ao criar formulário: ' + error.message);
    }
  };

  useEffect(() => {
    fetchData();

    const usersChannel = supabase
      .channel('admin_users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchData())
      .subscribe();

    const evalsChannel = supabase
      .channel('admin_evals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evaluations' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(evalsChannel);
    };
  }, []);

  const handleRespondComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setLoading(true);
    try {
      const savedUser = localStorage.getItem('auth_fallback_user');
      if (!savedUser) return;
      const parsed = JSON.parse(savedUser);

      // 1. Upload files first if any
      let attachmentUrls: string[] = [];
      if (selectedAdminFiles.length > 0) {
        setIsUploadingAdminFiles(true);
        try {
          attachmentUrls = await Promise.all(selectedAdminFiles.map(async (file) => {
            try {
              return await uploadOmbudsmanFile(file);
            } catch (err: any) {
              console.error(`Erro ao subir arquivo ${file.name}:`, err);
              throw new Error(`Falha no upload de "${file.name}". Verifique o tamanho (máx 10MB).`);
            }
          }));
        } finally {
          setIsUploadingAdminFiles(false);
        }
      }

      await respondToComplaint(
        selectedComplaint.id,
        adminResponse,
        complaintStatus,
        attachmentUrls
      );

      toast.success('Resposta enviada com sucesso!');
      setIsRespondingComplaint(false);
      setAdminResponse('');
      setSelectedAdminFiles([]);
      fetchData();
    } catch (error: any) {
      console.error('Erro detalhado na resposta do admin:', error);
      toast.error(error.message || 'Erro ao responder relato. Tente novamente.');
    } finally {
      setLoading(false);
      setIsUploadingAdminFiles(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.password.length < 6) {
      return toast.error('A senha deve ter no mínimo 6 caracteres');
    }
    setLoading(true);
    try {
      await createEmployeeAccount(newUser, newUser.password);
      
      toast.success('Colaborador cadastrado e conta criada!');
      setIsAddUserOpen(false);
      setNewUser({ name: '', email: '', role: 'employee', department: '', position: '', password: '', photo_url: '' });
    } catch (error: any) {
      toast.error('Erro ao cadastrar colaborador: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const savedUser = localStorage.getItem('auth_fallback_user');
    if (!savedUser) return;
    const parsed = JSON.parse(savedUser);

    try {
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userId,
          updateData: { status: currentStatus === 'active' ? 'inactive' : 'active' },
          adminEmail: parsed.email,
          adminAccessKey: parsed.access_key || parsed.accessKey
        })
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      
      toast.success('Status atualizado');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao atualizar status: ' + error.message);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const savedUser = localStorage.getItem('auth_fallback_user');
    if (!savedUser) return;
    const parsed = JSON.parse(savedUser);

    try {
      const updateData: any = {
        name: editingUser.name,
        department: editingUser.department,
        position: editingUser.position,
        role: editingUser.role,
        status: editingUser.status,
        photo_url: editingUser.photo_url || null
      };

      if (newPassword) {
        updateData.access_key = newPassword;
      }

      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: editingUser.uid,
          updateData,
          adminEmail: parsed.email,
          adminAccessKey: parsed.access_key || parsed.accessKey
        })
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      
      toast.success('Dados do colaborador atualizados!');
      setIsEditUserOpen(false);
      setNewPassword('');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao atualizar colaborador: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setLoading(true);
    try {
      await deleteEmployeeAccount(userToDelete.uid);
      toast.success('Colaborador removido permanentemente!');
      setIsDeleteConfirmOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao remover colaborador: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Tem certeza que deseja excluir este formulário? Esta ação não pode ser desfeita.')) return;
    
    const savedUser = localStorage.getItem('auth_fallback_user');
    if (!savedUser) return;
    const parsed = JSON.parse(savedUser);

    try {
      const response = await fetch('/api/admin/delete-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId,
          adminEmail: parsed.email,
          adminAccessKey: parsed.access_key || parsed.accessKey
        })
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      
      toast.success('Formulário excluído com sucesso');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao excluir formulário: ' + error.message);
    }
  };

  const handleOpenCycleWithForm = (formId: string) => {
    setSelectedFormIdForCycle(formId);
    setIsTriggerCycleOpen(true);
  };

  // Stats
  const totalUsers = users.length;
  const totalEvals = evaluations.length;
  const completedEvals = evaluations.filter(e => e.status === 'completed').length;
  const progress = totalEvals > 0 ? (completedEvals / totalEvals) * 100 : 0;

  const getEvaluationScore = (evaluation: any) => {
    if (evaluation.rating) return evaluation.rating;
    if (!evaluation.answers) return 0;
    
    const mapping: Record<string, number> = {
      'Nunca': 1,
      'Algumas Vezes': 3,
      'Sempre': 5
    };

    let totalPoints = 0;
    let count = 0;

    Object.values(evaluation.answers).forEach((ans: any) => {
      if (typeof ans === 'string' && mapping[ans] !== undefined) {
        totalPoints += mapping[ans];
        count++;
      } else if (typeof ans === 'number') {
        totalPoints += ans;
        count++;
      }
    });

    return count > 0 ? totalPoints / count : 0;
  };

  // Chart Data: Average Rating per User
  const chartData = users.map(user => {
    const userEvals = evaluations.filter(e => e.evaluated_id === user.uid && e.status === 'completed');
    const avg = userEvals.length > 0 
      ? userEvals.reduce((acc, curr) => acc + getEvaluationScore(curr), 0) / userEvals.length 
      : 0;
    return {
      name: user.name,
      avg: parseFloat(avg.toFixed(1))
    };
  }).filter(d => d.avg > 0).sort((a, b) => b.avg - a.avg);

  // Advanced Filtering for Evaluation Log
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(evalItem => {
      const matchesSearch = 
        evalItem.evaluator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evalItem.evaluated_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evalItem.comment?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || evalItem.status === statusFilter;
      const matchesEvaluator = evaluatorFilter === 'all' || evalItem.evaluator_id === evaluatorFilter;
      const matchesEvaluated = evaluatedFilter === 'all' || evalItem.evaluated_id === evaluatedFilter;
      
      // For department filter, we need to find the evaluated user's department
      const evaluatedUser = users.find(u => u.uid === evalItem.evaluated_id);
      const matchesDept = deptFilter === 'all' || evaluatedUser?.department === deptFilter;

      const matchesForm = 
        formFilter === 'all' || 
        (formFilter === 'null' ? !evalItem.form_id : evalItem.form_id === formFilter);

      return matchesSearch && matchesStatus && matchesEvaluator && matchesEvaluated && matchesDept && matchesForm;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [evaluations, searchTerm, statusFilter, evaluatorFilter, evaluatedFilter, deptFilter, formFilter, users]);

  // Dynamic Average for filtered set
  const filteredAverage = useMemo(() => {
    if (!filteredEvaluations) return 0;
    const completed = filteredEvaluations.filter(e => e.status === 'completed');
    if (completed.length === 0) return 0;
    const sum = completed.reduce((acc, curr) => acc + getEvaluationScore(curr), 0);
    return parseFloat((sum / completed.length).toFixed(2));
  }, [filteredEvaluations]);

  const departments = useMemo(() => {
    const depts = new Set(users.map(u => u.department).filter(Boolean));
    return Array.from(depts);
  }, [users]);

  const handleExportPDF = () => {
    if (filteredEvaluations.length === 0) {
      toast.error('Não há dados para exportar.');
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      let currentY = 0;

      filteredEvaluations.forEach((e, index) => {
        // Check if we need a new page (if space is less than 60 units)
        const spaceNeeded = 60;
        if (index > 0 && currentY + spaceNeeded > 280) {
          doc.addPage();
          currentY = 0;
        }

        // 1. Header / Separator
        if (index === 0 || currentY === 0) {
          doc.setFillColor(37, 99, 235); // Blue-600 (Primary)
          doc.rect(0, currentY, pageWidth, 18, 'F');
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Avalia360 - Gran Bernardo', 12, currentY + 10);
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text('Relatório de Avaliações', 12, currentY + 15);
          currentY += 25;
        } else {
          // Compact separator for subsequent evaluations on the same page
          doc.setDrawColor(37, 99, 235);
          doc.setLineWidth(0.5);
          doc.line(12, currentY + 5, pageWidth - 12, currentY + 5);
          currentY += 12;
        }

        // 2. Info Section (Two Columns)
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`AVALIAÇÃO #${index + 1}: ${e.evaluated_name}`, 12, currentY);
        
        doc.setDrawColor(220, 220, 220);
        doc.line(12, currentY + 2, pageWidth - 12, currentY + 2);

        const statusLabel = e.status === 'completed' ? 'Concluído' : 'Pendente';
        const dateStr = new Date(e.completed_at || e.created_at).toLocaleDateString('pt-BR');
        const rating = e.status === 'completed' ? getEvaluationScore(e).toFixed(1) : '-';

        const evaluatedUser = users.find(u => u.uid === e.evaluated_id);
        const evaluatorUser = users.find(u => u.uid === e.evaluator_id);
        const evaluatedDept = evaluatedUser?.department ? ` (${evaluatedUser.department})` : '';
        const evaluatorDept = evaluatorUser?.department ? ` (${evaluatorUser.department})` : '';

        autoTable(doc, {
          startY: currentY + 5,
          head: [],
          body: [
            ['Avaliado:', `${e.evaluated_name || '-'}${evaluatedDept}`, 'Data:', dateStr],
            ['Avaliador:', `${e.evaluator_name || '-'}${evaluatorDept}`, 'Status:', statusLabel],
            ['', '', 'Nota:', rating]
          ],
          theme: 'plain',
          styles: { fontSize: 7.5, cellPadding: 1 },
          columnStyles: { 
            0: { fontStyle: 'bold', cellWidth: 25 },
            1: { cellWidth: 60 },
            2: { fontStyle: 'bold', cellWidth: 20 },
            3: { cellWidth: 'auto' }
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;

        // 3. Comments & Answers Section
        let details = [];
        if (e.comment) {
          details.push(['Comentário Geral:', e.comment]);
        }

        if (e.answers && Object.keys(e.answers).length > 0) {
          const questions = questionsMap[e.form_id || ''] || [];
          Object.entries(e.answers).forEach(([qId, ans]: [string, any]) => {
            const q = questions.find((quest: any) => quest.id === qId);
            const qText = q ? q.question_text.replace(/\n/g, ' ') : `Questão ${qId}`;
            details.push([qText, ans]);
          });
        }

        if (details.length > 0) {
          autoTable(doc, {
            startY: currentY,
            body: details,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
            columnStyles: { 
              0: { fontStyle: 'bold', cellWidth: 45, fillColor: [250, 250, 250] },
              1: { cellWidth: 'auto' }
            },
            headStyles: { fillColor: [37, 99, 235] },
            margin: { left: 12, right: 12 }
          });
          currentY = (doc as any).lastAutoTable.finalY + 12;
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.text('Nenhuma resposta detalhada disponível.', 12, currentY + 2);
          currentY += 10;
        }
      });

      // 4. Footer (on each page)
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, 285, { align: 'center' });
        doc.text('Gerado automaticamente pelo Sistema Avalia360 - Gran Bernardo', pageWidth / 2, 290, { align: 'center' });
      }

      doc.save(`relatorio_log_avalia360_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Erro ao gerar PDF.');
    }
  };

  const handleExportExcel = () => {
    if (filteredEvaluations.length === 0) {
      toast.error('Não há dados para exportar.');
      return;
    }

    try {
      const headers = ['Status', 'Data', 'Avaliador', 'Colaborador Avaliado', 'Nota', 'Comentário / Respostas'];
      
      const rows = filteredEvaluations.map(e => {
        const status = e.status === 'completed' ? 'Concluído' : 'Pendente';
        const date = new Date(e.completed_at || e.created_at).toLocaleDateString('pt-BR');
        
        const evaluatedUser = users.find(u => u.uid === e.evaluated_id);
        const evaluatorUser = users.find(u => u.uid === e.evaluator_id);
        const evaluatedDept = evaluatedUser?.department ? ` (${evaluatedUser.department})` : '';
        const evaluatorDept = evaluatorUser?.department ? ` (${evaluatorUser.department})` : '';
        
        const evaluator = e.evaluator_name ? `${e.evaluator_name}${evaluatorDept}` : '-';
        const evaluated = e.evaluated_name ? `${e.evaluated_name}${evaluatedDept}` : '-';
        const rating = e.status === 'completed' ? getEvaluationScore(e).toFixed(1) : '-';
        
        // Handle comment or answers for custom forms
        let commentOrAnswers = e.comment || '';
        if (!commentOrAnswers && e.answers && Object.keys(e.answers).length > 0) {
          commentOrAnswers = Object.entries(e.answers)
            .map(([qId, ans]) => {
              const questions = questionsMap[e.form_id || ''] || [];
              const q = questions.find((quest: any) => quest.id === qId);
              const qText = q ? q.question_text.split('\n')[0] : qId;
              return `<strong>${qText}:</strong> ${ans}`;
            })
            .join('<br>');
        }
        
        if (!commentOrAnswers && e.status === 'completed') commentOrAnswers = 'Sem comentário';
        if (!commentOrAnswers) commentOrAnswers = '-';

        return `
          <tr>
            <td style="color: ${e.status === 'completed' ? '#16a34a' : '#d97706'}; font-weight: bold;">${status}</td>
            <td>${date}</td>
            <td>${evaluator}</td>
            <td>${evaluated}</td>
            <td style="text-align: center;">${rating}</td>
            <td>${commentOrAnswers}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8">
          <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Avaliações</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
          <style>
            table { border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1; }
            th { background-color: #f1f5f9; color: #475569; font-weight: bold; border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            td { border: 1px solid #cbd5e1; padding: 10px; vertical-align: top; font-family: sans-serif; font-size: 13px; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `avaliacoes_avalia360_${new Date().toISOString().split('T')[0]}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Excel gerado e formatado com sucesso!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar dados.');
    }
  };

  if (isFormBuilderOpen) {
    return (
      <div className="p-6 bg-slate-100 min-h-screen">
        <div className="max-w-4xl mx-auto mb-6">
          <Button variant="ghost" onClick={() => setIsFormBuilderOpen(false)}>
            ← Voltar ao painel
          </Button>
        </div>
        <FormBuilder 
          onCancel={() => setIsFormBuilderOpen(false)} 
          onSave={handleCreateForm} 
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto text-slate-900">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie colaboradores, configurações e ciclos de avaliação.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="lg" onClick={() => setIsFormBuilderOpen(true)} className="gap-2">
            <Layers className="h-5 w-5" /> Criar Formulário
          </Button>
          <Button variant="outline" size="lg" onClick={() => setIsSettingsOpen(true)} className="gap-2">
            <Settings className="h-5 w-5" /> Configurações
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={handleTriggerActivitiesMapping} 
            disabled={loading}
            className="gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
          >
            <FileText className="h-5 w-5" /> Mapeamento
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setIsTriggerCycleOpen(true)} className="gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200">
            <RefreshCw className="h-5 w-5" /> Novo Ciclo
          </Button>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger render={<Button size="lg" />}>
              <UserPlus className="mr-2 h-5 w-5" /> Novo Colaborador
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Colaborador</DialogTitle>
              <DialogDescription>
                Adicione um novo membro à equipe. O sistema gerará automaticamente as avaliações pendentes.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4 mb-4">
                <Avatar className="h-24 w-24 border-2 border-slate-100 shadow-sm">
                  <AvatarImage src={newUser.photo_url} />
                  <AvatarFallback className="bg-slate-50 text-slate-400">
                    <Camera className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="relative">
                  <input 
                    type="file" 
                    id="photo-upload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-2"
                    disabled={uploading}
                    onClick={() => document.getElementById('photo-upload')?.click()}
                  >
                   {uploading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                   {newUser.photo_url ? 'Trocar Foto' : 'Subir Foto'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail Corporativo</Label>
                <Input id="email" type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Perfil</Label>
                  <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Colaborador</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="client">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Chave de Acesso Inicial</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="text" 
                      required 
                      placeholder="Ex: 123456"
                      className="pl-10"
                      value={newUser.password} 
                      onChange={e => setNewUser({...newUser, password: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept">Setor</Label>
                <Input id="dept" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Processando...' : 'Confirmar Cadastro'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl w-full max-w-2xl justify-start">
          <TabsTrigger value="insights" className="rounded-lg px-6 py-2">
            <BarChart3 className="h-4 w-4 mr-2" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="team" className="rounded-lg px-6 py-2">
            <Users className="h-4 w-4 mr-2" /> Equipe
          </TabsTrigger>
          <TabsTrigger value="forms" className="rounded-lg px-6 py-2">
            <FileText className="h-4 w-4 mr-2" /> Formulários
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Auditoria
          </TabsTrigger>
          <TabsTrigger value="complaints" className="gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" /> Ouvidoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Avaliações Previstas</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Realizadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedEvals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Progresso Geral</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{progress.toFixed(1)}%</div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Média de Desempenho (Ranking)</CardTitle>
            <CardDescription>Visualização comparativa das notas médias dos colaboradores.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 5]} hide />
                  <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2 border rounded shadow-sm">
                            <p className="font-bold">{payload[0].payload.name}</p>
                            <p className="text-primary">Nota: {payload[0].value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avg >= 4 ? "#10b981" : entry.avg >= 3 ? "#3b82f6" : "#f59e0b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border-2 border-dashed rounded-xl">
                <p>Sem dados suficientes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>

    <TabsContent value="team" className="space-y-6">

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
            <CardDescription>Lista de todos os colaboradores cadastrados no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Nota Média</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={user.photo_url} />
                        <AvatarFallback className="text-[10px] font-bold">
                          {user.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>
                      {(() => {
                        const userEvals = evaluations.filter(e => e.evaluated_id === user.uid && e.status === 'completed');
                        const avg = userEvals.length > 0 
                          ? userEvals.reduce((acc, curr) => acc + (curr.rating || 0), 0) / userEvals.length 
                          : 0;
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${
                              avg >= 4 ? "text-green-600" : avg >= 3 ? "text-blue-600" : avg > 0 ? "text-amber-600" : "text-slate-400"
                            }`}>
                              {avg > 0 ? avg.toFixed(1) : '-'}
                            </span>
                            {avg > 0 && <Star className={`h-3 w-3 fill-current ${avg >= 4 ? "text-green-600" : avg >= 3 ? "text-blue-600" : "text-amber-600"}`} />}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1"
                          onClick={() => {
                            setSelectedUserForDetails(user);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <ClipboardList className="h-3.5 w-3.5" /> Detalhes
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={() => {
                            setEditingUser(user);
                            setNewPassword('');
                            setIsEditUserOpen(true);
                          }}
                          title="Editar colaborador"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setUserToDelete(user);
                            setIsDeleteConfirmOpen(true);
                          }}
                          title="Excluir permanentemente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleUserStatus(user.id, user.status)}
                        >
                          {user.status === 'active' ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="forms" className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" /> Gestão de Formulários
              </CardTitle>
              <CardDescription>Personalize as perguntas e critérios de avaliação.</CardDescription>
            </div>
            <Button onClick={() => setIsFormBuilderOpen(true)} className="gap-2">
              <Layers className="h-4 w-4" /> Novo Formulário
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-bold text-primary">{form.title}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-slate-500">{form.description || '-'}</TableCell>
                    <TableCell>{new Date(form.created_at || '').toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 gap-1"
                          onClick={() => handleOpenCycleWithForm(form.id)}
                        >
                          <SendHorizontal className="h-3.5 w-3.5" /> Publicar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={() => handleDeleteForm(form.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {forms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">
                      Nenhum formulário personalizado criado ainda. Crie um para começar!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="logs">
        <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" /> Log de Avaliações
            </CardTitle>
            <CardDescription>Feed completo e ferramentas de auditoria das avaliações do sistema.</CardDescription>
          </div>
          <div className="flex gap-4">
            <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase tracking-wider font-bold text-primary/70">Média (Filtro)</span>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-2xl font-black text-primary">{filteredAverage || '0.0'}</span>
              </div>
            </div>
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total</span>
              <span className="text-2xl font-black text-slate-700">{filteredEvaluations.length}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-end gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Search className="h-3 w-3" /> Busca
              </Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Nome ou comentário..." 
                  className="h-9 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-9 w-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shrink-0"
                  onClick={handleExportExcel}
                  title="Exportar Excel"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-9 w-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shrink-0"
                  onClick={handleExportPDF}
                  title="Exportar PDF (Relatórios Individuais)"
                >
                  <FileDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="w-44 space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Filter className="h-3 w-3" /> Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue>
                    {statusFilter === 'all' ? 'Todos' : 
                     statusFilter === 'pending' ? 'Pendentes' : 'Concluídos'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-56 space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Avaliador</Label>
              <Select value={evaluatorFilter} onValueChange={setEvaluatorFilter}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue>
                    {evaluatorFilter === 'all' ? 'Todos' : (users.find(u => u.uid === evaluatorFilter)?.name || 'Todos')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {users.filter(u => u.role !== 'admin').map(u => (
                    <SelectItem key={u.uid} value={u.uid}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-56 space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Avaliado</Label>
              <Select value={evaluatedFilter} onValueChange={setEvaluatedFilter}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue>
                    {evaluatedFilter === 'all' ? 'Todos' : (users.find(u => u.uid === evaluatedFilter)?.name || 'Todos')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {users.filter(u => u.role !== 'admin').map(u => (
                    <SelectItem key={u.uid} value={u.uid}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-44 space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Setor</Label>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue>
                    {deptFilter === 'all' ? 'Todos os setores' : deptFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-56 space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Formulário</Label>
              <Select value={formFilter} onValueChange={setFormFilter}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue>
                    {formFilter === 'all' ? 'Todos os formulários' : 
                     formFilter === 'null' ? 'Padrão / Geral' : 
                     (forms.find(f => f.id === formFilter)?.title || 'Todos')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os formulários</SelectItem>
                  <SelectItem value="null">Padrão / Geral</SelectItem>
                  {forms.map(form => (
                    <SelectItem key={form.id} value={form.id}>{form.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[100px] font-bold">Status</TableHead>
                  <TableHead className="w-[120px] font-bold">Data</TableHead>
                  <TableHead className="font-bold">Avaliador</TableHead>
                  <TableHead className="font-bold">Colaborador Avaliado</TableHead>
                  <TableHead className="w-[100px] font-bold">Nota</TableHead>
                  <TableHead className="font-bold">Comentário</TableHead>
                  <TableHead className="w-[80px] text-right font-bold">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvaluations
                  .slice(0, 50)
                  .map((evalItem) => (
                    <TableRow key={evalItem?.id || Math.random().toString()} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <Badge 
                          variant={evalItem?.status === 'completed' ? 'default' : 'secondary'}
                          className={evalItem?.status === 'completed' ? 'bg-green-100 text-green-700 hover:bg-green-100 border-none' : ''}
                        >
                          {evalItem?.status === 'completed' ? 'Concluído' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {new Date(evalItem.completed_at || evalItem.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">
                        {evalItem.evaluator_name}
                        <span className="block text-xs text-slate-400 font-normal">
                          {users.find(u => u.uid === evalItem.evaluator_id)?.department || ''}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">
                        {evalItem.evaluated_name}
                        <span className="block text-xs text-slate-400 font-normal">
                          {users.find(u => u.uid === evalItem.evaluated_id)?.department || ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        {evalItem.status === 'completed' ? (
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`h-3 w-3 ${star <= (evalItem.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-200">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm italic text-slate-500" title={evalItem.comment}>
                        {evalItem.comment || (evalItem.status === 'completed' ? 'Sem comentário' : '-')}
                      </TableCell>
                      <TableCell className="text-right">
                        {evalItem.status === 'completed' && (
                          <Button 
                            variant="ghost" 
                            size="icon-sm"
                            onClick={() => {
                              setSelectedEvalForDetail(evalItem);
                              setIsEvalDetailOpen(true);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                {filteredEvaluations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2 opacity-50">
                        <Filter className="h-10 w-10 mb-2" />
                        <p className="font-medium">Nenhuma avaliação encontrada com estes filtros.</p>
                        <p className="text-xs">Tente ajustar seus critérios de busca.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filteredEvaluations.length > 50 && (
            <p className="text-center text-[10px] text-muted-foreground mt-4">
              Mostrando os 50 eventos mais recentes correspondentes aos filtros.
            </p>
          )}
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="complaints">
      <Card className="shadow-xl border-t-4 border-t-primary">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" /> Ouvidoria e Denúncias
              </CardTitle>
              <CardDescription>Gerencie os relatos e denúncias enviados pelo canal público.</CardDescription>
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              {complaints.length} Relatos
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex-1">
              <Label className="text-xs mb-1.5 block text-slate-500 font-bold">Buscar Protocolo / Assunto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Pesquisar..." 
                  className="pl-9 bg-white"
                  value={complaintSearchTerm}
                  onChange={e => setComplaintSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <Label className="text-xs mb-1.5 block text-slate-500 font-bold">Status do Relato</Label>
              <Select value={complaintStatusFilter} onValueChange={setComplaintStatusFilter}>
                <SelectTrigger className="bg-white">
                  <SelectValue>
                    {complaintStatusFilter === 'all' ? 'Todos os Status' : 
                     complaintStatusFilter === 'pendente' ? 'Pendente' :
                     complaintStatusFilter === 'em_analise' ? 'Em Análise' :
                     complaintStatusFilter === 'resolvido' ? 'Resolvido' : 'Arquivado'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Label className="text-xs mb-1.5 block text-slate-500 font-bold">Tipo de Relato</Label>
              <Select value={complaintTypeFilter} onValueChange={setComplaintTypeFilter}>
                <SelectTrigger className="bg-white">
                  <SelectValue>
                    {complaintTypeFilter === 'all' ? 'Todos os Tipos' : 
                     complaintTypeFilter === 'reclamacao' ? 'Reclamação' :
                     complaintTypeFilter === 'sugestao' ? 'Sugestão' :
                     complaintTypeFilter === 'elogio' ? 'Elogio' : 'Denúncia'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="reclamacao">Reclamação</SelectItem>
                  <SelectItem value="sugestao">Sugestão</SelectItem>
                  <SelectItem value="elogio">Elogio</SelectItem>
                  <SelectItem value="denuncia">Denúncia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Protocolo</TableHead>
                  <TableHead className="font-bold">Tipo</TableHead>
                  <TableHead className="font-bold">Assunto</TableHead>
                  <TableHead className="font-bold">Data</TableHead>
                  <TableHead className="text-right font-bold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const filteredComplaints = complaints.filter(c => {
                    const matchesStatus = complaintStatusFilter === 'all' || c.status === complaintStatusFilter;
                    const matchesType = complaintTypeFilter === 'all' || c.type === complaintTypeFilter;
                    const matchesSearch = complaintSearchTerm === '' || 
                      c.protocol.toLowerCase().includes(complaintSearchTerm.toLowerCase()) || 
                      c.subject.toLowerCase().includes(complaintSearchTerm.toLowerCase());
                    return matchesStatus && matchesType && matchesSearch;
                  });

                  return filteredComplaints.length > 0 ? filteredComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell>
                      {complaint.status === 'pendente' && <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">Pendente</Badge>}
                      {complaint.status === 'em_analise' && <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Em Análise</Badge>}
                      {complaint.status === 'resolvido' && <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Resolvido</Badge>}
                      {complaint.status === 'arquivado' && <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">Arquivado</Badge>}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-xs">{complaint.protocol}</TableCell>
                    <TableCell className="capitalize text-xs">
                      {complaint.type === 'reclamacao' ? 'Reclamação' : 
                       complaint.type === 'sugestao' ? 'Sugestão' : 
                       complaint.type === 'denuncia' ? 'Denúncia' : 
                       complaint.type}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">{complaint.subject}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(complaint.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Ver Detalhes"
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setAdminResponse(complaint.response || '');
                          setComplaintStatus(complaint.status);
                          setIsRespondingComplaint(true);
                        }}
                      >
                        <Eye className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setAdminResponse(complaint.response || '');
                          setComplaintStatus(complaint.status);
                          setIsRespondingComplaint(true);
                        }}
                      >
                        <Send className="h-4 w-4" /> Responder
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                      {complaints.length === 0 
                        ? 'Nenhum relato recebido até o momento.' 
                        : 'Nenhum relato encontrado com os filtros selecionados.'}
                    </TableCell>
                  </TableRow>
                )
                })()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>

  {/* Responding Complaint Dialog */}
  <Dialog open={isRespondingComplaint} onOpenChange={setIsRespondingComplaint}>
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Detalhes e Resposta ao Relato</DialogTitle>
        <DialogDescription>Protocolo: <span className="font-mono font-bold">{selectedComplaint?.protocol}</span></DialogDescription>
      </DialogHeader>
      {selectedComplaint && (
        <form onSubmit={handleRespondComplaint} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg border">
              <Label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Tipo</Label>
              <p className="text-sm font-semibold capitalize">{selectedComplaint.type}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border">
              <Label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Data de Envio</Label>
              <p className="text-sm font-semibold">{new Date(selectedComplaint.created_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>
          
          <div className="p-3 bg-slate-50 rounded-lg border">
            <Label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Assunto</Label>
            <p className="text-sm font-semibold">{selectedComplaint.subject}</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border">
            <Label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Descrição</Label>
            <p className="text-sm whitespace-pre-wrap">{selectedComplaint.description}</p>
            {selectedComplaint.attachments && selectedComplaint.attachments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Anexos do Cidadão</p>
                <div className="flex flex-wrap gap-2">
                  {selectedComplaint.attachments.map((url: string, i: number) => (
                    <AttachmentDisplay url={url} key={`admin-attach-${i}`} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {!selectedComplaint.is_anonymous && selectedComplaint.contact_email && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Label className="text-[10px] uppercase text-primary font-bold block mb-1 flex items-center gap-1">
                <Mail className="h-3 w-3" /> E-mail de Contato
              </Label>
              <p className="text-sm font-semibold">{selectedComplaint.contact_email}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={complaintStatus} onValueChange={setComplaintStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conversation History */}
          {selectedComplaint.messages && selectedComplaint.messages.length > 0 && (
            <div className="space-y-3 mt-4 border-t pt-4">
              <Label className="text-[10px] uppercase text-slate-400 font-bold block mb-2">Histórico da Conversa</Label>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {selectedComplaint.messages.map((msg: any, idx: number) => (
                  <div key={idx} className={`flex ${msg.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`${msg.role === 'admin' ? 'bg-primary/10 border-primary/20' : 'bg-slate-100 border-slate-200'} border rounded-xl p-3 max-w-[90%] shadow-sm`}>
                      <p className={`text-[10px] font-bold mb-1 ${msg.role === 'admin' ? 'text-primary' : 'text-slate-500'}`}>
                        {msg.role === 'admin' ? 'Administração' : 'Usuário / Protocolo'}
                      </p>
                      <p className="text-xs text-slate-800 whitespace-pre-wrap">{msg.content}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className={`mt-2 pt-2 border-t ${msg.role === 'admin' ? 'border-primary/20' : 'border-slate-200'}`}>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.attachments.map((url: string, j: number) => (
                              <AttachmentDisplay url={url} key={`admin-msg-attach-${j}`} />
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-[8px] text-slate-400 mt-1">{new Date(msg.timestamp).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response Form */}
          {!(selectedComplaint.status === 'resolvido' || selectedComplaint.status === 'arquivado') ? (
            <div className="space-y-3">
              <Label>Sua Próxima Resposta (Visível para o autor)</Label>
              <Textarea 
                placeholder="Escreva sua resposta ou feedback..."
                className="min-h-[80px]"
                value={adminResponse}
                onChange={e => setAdminResponse(e.target.value)}
              />
              
              {/* Admin File Selection */}
              <div className="flex flex-wrap gap-2">
                {selectedAdminFiles.map((file, i) => (
                  <div key={i} className="relative bg-slate-50 border rounded p-1 px-2 flex items-center gap-2 pr-6">
                    {file.type.startsWith('image/') ? <ImageIcon className="w-3 h-3 text-blue-500" /> : <FileIcon className="w-3 h-3 text-slate-500" />}
                    <span className="text-[9px] max-w-[80px] truncate">{file.name}</span>
                    <button type="button" onClick={() => setSelectedAdminFiles(f => f.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 text-slate-300 hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                  </div>
                ))}
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded cursor-pointer hover:bg-slate-50 transition-colors text-[10px] font-medium text-slate-600">
                  <input type="file" className="hidden" multiple onChange={e => {
                    if (e.target.files) setSelectedAdminFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }} />
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  Anexar Arquivos
                </label>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-100 rounded-lg text-center border">
              <p className="text-sm font-semibold text-slate-600">Este relato está encerrado.</p>
              <p className="text-xs text-slate-500 mt-1">Para enviar uma nova mensagem, altere o status acima para "Pendente" ou "Em Análise" e salve as alterações para reabrir o chamado.</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsRespondingComplaint(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || isUploadingAdminFiles}>
              {loading || isUploadingAdminFiles ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  {isUploadingAdminFiles ? 'Enviando...' : 'Salvando...'}
                </>
              ) : ((selectedComplaint.status === 'resolvido' || selectedComplaint.status === 'arquivado') ? 'Salvar Novo Status' : 'Salvar Resposta')}
            </Button>
          </div>
        </form>
      )}
    </DialogContent>
  </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
            <DialogDescription>Atualize as informações do perfil do colaborador.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleEditUser} className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4 mb-4">
                <Avatar className="h-24 w-24 border-2 border-slate-100 shadow-sm">
                  <AvatarImage src={editingUser.photo_url} />
                  <AvatarFallback className="bg-slate-50 text-slate-400 font-bold text-xl uppercase">
                    {editingUser.name?.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="relative">
                  <input 
                    type="file" 
                    id="edit-photo-upload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, true);
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-2"
                    disabled={uploading}
                    onClick={() => document.getElementById('edit-photo-upload')?.click()}
                  >
                   {uploading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                   {editingUser.photo_url ? 'Trocar Foto' : 'Subir Foto'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome Completo</Label>
                <Input id="edit-name" required value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail (Apenas leitura)</Label>
                <Input id="edit-email" disabled value={editingUser.email} className="bg-slate-50" />
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Alteração de e-mail requer ação do usuário ou Admin SDK.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Perfil</Label>
                  <Select value={editingUser.role} onValueChange={v => setEditingUser({...editingUser, role: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Colaborador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editingUser.status} onValueChange={v => setEditingUser({...editingUser, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-dept">Setor</Label>
                  <Input id="edit-dept" value={editingUser.department} onChange={e => setEditingUser({...editingUser, department: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pos">Cargo</Label>
                  <Input id="edit-pos" value={editingUser.position} onChange={e => setEditingUser({...editingUser, position: e.target.value})} />
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="edit-password">Chave de Acesso</Label>
                    <Badge variant="outline" className="text-[10px] font-normal">Privado</Badge>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="edit-password" 
                      type="text" 
                      placeholder="Nova chave de acesso"
                      className="pl-10"
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    O colaborador usará esta chave para entrar no sistema.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => {
                    setIsEditUserOpen(false);
                    setNewPassword('');
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir permanentemente o colaborador <strong>{userToDelete?.name}</strong>?
              Esta ação removerá o acesso ao sistema e apagará todas as avaliações vinculadas a ele.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <p className="text-xs text-muted-foreground bg-amber-50 p-3 rounded-lg border border-amber-100">
              <strong>Atenção:</strong> Esta ação não pode ser desfeita. O usuário será removido do banco de dados e da lista de autenticação.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={loading}>
              {loading ? 'Excluindo...' : 'Sim, Excluir Permanentemente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Detalhes: {selectedUserForDetails?.name}
            </DialogTitle>
            <DialogDescription>
              Histórico completo de avaliações enviadas e recebidas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-slate-50 border-none">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Nota Média Geral</p>
                  <p className="text-3xl font-bold text-primary">
                    {(() => {
                      const evals = evaluations.filter(e => e.evaluated_id === selectedUserForDetails?.uid && e.status === 'completed');
                      const avg = evals.length > 0 ? evals.reduce((acc, curr) => acc + (curr.rating || 0), 0) / evals.length : 0;
                      return avg > 0 ? avg.toFixed(1) : 'N/A';
                    })()}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 border-none">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Avaliações Recebidas</p>
                  <p className="text-3xl font-bold">
                    {evaluations.filter(e => e.evaluated_id === selectedUserForDetails?.uid && e.status === 'completed').length}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Comentários Recebidos</h3>
              <div className="space-y-3">
                {evaluations
                  .filter(e => e.evaluated_id === selectedUserForDetails?.uid && e.status === 'completed')
                  .sort((a,b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
                  .map(e => (
                    <div 
                      key={e.id} 
                      className="p-3 bg-white border rounded-lg space-y-2 cursor-pointer hover:border-primary hover:shadow-sm transition-all group"
                      onClick={() => {
                        setSelectedEvalForDetail(e);
                        setIsEvalDetailOpen(true);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={`h-3 w-3 ${i <= (e.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{new Date(e.completed_at).toLocaleDateString('pt-BR')}</span>
                          <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                      <p className="text-sm italic text-slate-600">"{e.comment}"</p>
                    </div>
                  ))}
                {evaluations.filter(e => e.evaluated_id === selectedUserForDetails?.uid && e.status === 'completed').length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 italic">Nenhuma avaliação recebida ainda.</p>
                )}
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Avaliações Realizadas</h3>
              <div className="grid grid-cols-1 gap-2">
                {evaluations
                  .filter(e => e.evaluator_id === selectedUserForDetails?.uid)
                  .map(e => (
                    <div key={e.id} className="flex items-center justify-between p-2 border rounded text-xs">
                      <span>Avaliou: <strong>{e.evaluated_name}</strong></span>
                      <Badge variant={e.status === 'completed' ? 'default' : 'secondary'}>
                        {e.status === 'completed' ? 'Concluído' : 'Pendente'}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TriggerCycleDialog 
        open={isTriggerCycleOpen} 
        onOpenChange={setIsTriggerCycleOpen} 
        users={users} 
        forms={forms}
        onTrigger={handleTriggerCycleCustom}
        onTriggerLegacy={handleTriggerCycleLegacy}
        defaultFormId={selectedFormIdForCycle}
      />

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Configurações do Sistema</DialogTitle>
            <DialogDescription>Ajuste a frequência e o comportamento das avaliações.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Frequência de Avaliação (Dias)</Label>
              <Select value={evaluationFrequency} onValueChange={setEvaluationFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Mensal (30 dias)</SelectItem>
                  <SelectItem value="60">Bimestral (60 dias)</SelectItem>
                  <SelectItem value="90">Trimestral (90 dias)</SelectItem>
                  <SelectItem value="180">Semestral (180 dias)</SelectItem>
                  <SelectItem value="365">Anual (365 dias)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground italic">Intervalo sugerido entre os ciclos de avaliação.</p>
            </div>
            
            <div className="pt-4 border-t">
              <Button className="w-full" onClick={() => {
                handleUpdateSettings(evaluationFrequency);
                setIsSettingsOpen(false);
              }} disabled={loading}>
                Salvar Configurações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Evaluation Detail Dialog */}
      <Dialog open={isEvalDetailOpen} onOpenChange={setIsEvalDetailOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Detalhamento da Avaliação
            </DialogTitle>
            <DialogDescription>
              Respostas detalhadas, somatório e média de desempenho.
            </DialogDescription>
          </DialogHeader>

          {selectedEvalForDetail && (
            <div className="space-y-6 py-4">
              {/* Info Header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Avaliador</p>
                  <p className="text-sm font-semibold">{selectedEvalForDetail.evaluator_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Avaliado</p>
                  <p className="text-sm font-semibold">{selectedEvalForDetail.evaluated_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Data</p>
                  <p className="text-sm font-semibold">{new Date(selectedEvalForDetail.completed_at || selectedEvalForDetail.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Média Final</p>
                  <div className="flex items-center justify-end gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-lg font-black text-primary">{getEvaluationScore(selectedEvalForDetail).toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Answers Breakdown */}
              <div className="space-y-8">
                {(() => {
                  const evalQuestions = questionsMap[selectedEvalForDetail.form_id || ''] || [];
                  const answers = selectedEvalForDetail.answers || {};
                  
                  // Group questions by category (consistent with DynamicFormRenderer)
                  const grouped: Record<string, any[]> = {};
                  evalQuestions.forEach(q => {
                    let cat = q.category || 'Geral';
                    if (!q.category && q.question_text.includes(': ')) {
                      const p = q.question_text.split(': ');
                      if (p[0].length < 40) cat = p[0];
                    }
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(q);
                  });

                  const mapping: Record<string, number> = { 'Nunca': 1, 'Algumas Vezes': 3, 'Sempre': 5 };
                  let totalSum = 0;
                  let validCount = 0;

                  return (
                    <>
                      {Object.entries(grouped).map(([category, qs]) => (
                        <div key={category} className="space-y-3">
                          <h3 className="text-sm font-bold text-primary flex items-center gap-2 border-b pb-2">
                            <div className="w-1 h-4 bg-primary rounded-full" />
                            {category}
                          </h3>
                          <div className="space-y-3">
                            {qs.map((q, idx) => {
                              const ans = answers[q.id || ''];
                              const score = typeof ans === 'string' ? mapping[ans] : (typeof ans === 'number' ? ans : null);
                              if (score !== null) {
                                totalSum += score;
                                validCount++;
                              }

                              // Clean question text if it has prefix
                              let displayPrompt = q.question_text;
                              if (displayPrompt.includes(': ')) {
                                const p = displayPrompt.split(': ');
                                if (p[0].length < 40) displayPrompt = p.slice(1).join(': ');
                              }

                              return (
                                <div key={q.id || idx} className="flex justify-between items-start gap-4 p-3 bg-white rounded-lg border border-slate-100 hover:bg-slate-50/50 transition-colors">
                                  <div className="space-y-1 flex-1">
                                    <p className="text-sm font-medium text-slate-700">{displayPrompt}</p>
                                    <p className="text-xs text-muted-foreground">Resposta: <span className="text-primary font-semibold">{ans ||'-'}</span></p>
                                  </div>
                                  {score !== null && (
                                    <Badge variant="outline" className="bg-slate-50 font-bold border-slate-200">
                                      {score} pts
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Totals Summary */}
                      <div className="pt-6 border-t mt-8">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg border-2 border-primary/20">
                            <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Somatório de Notas</p>
                            <p className="text-3xl font-black">{totalSum} <span className="text-sm font-normal opacity-50">pontos</span></p>
                          </div>
                          <div className="bg-primary text-white p-4 rounded-xl shadow-lg">
                            <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Média da Avaliação</p>
                            <p className="text-3xl font-black">
                              {validCount > 0 ? (totalSum / validCount).toFixed(2) : '0.00'} 
                              <span className="text-sm font-normal opacity-50 ml-2">/ 5.0</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Comment Section */}
                      {selectedEvalForDetail.comment && (
                        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
                          <p className="text-[10px] uppercase font-bold text-amber-600 mb-2">Comentário Adicional</p>
                          <p className="text-sm italic text-amber-900 leading-relaxed">"{selectedEvalForDetail.comment}"</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setIsEvalDetailOpen(false)}>Fechar Detalhes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
