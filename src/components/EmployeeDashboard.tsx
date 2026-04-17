import { useState } from 'react';
import { supabase } from '../supabase';
import { useEvaluations } from '../hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, ClipboardCheck, Clock, Send, UserCircle, AlertCircle, FileText, Camera, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const EmployeeDashboard = () => {
  const { pendingEvaluations, completedEvaluations, loading, forms, formQuestions } = useEvaluations();
  
  // Get current user from local storage
  const savedUser = localStorage.getItem('auth_fallback_user');
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const [selectedEval, setSelectedEval] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isFormComplete, setIsFormComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const isCustomForm = !!selectedEval?.form_id;

    if (isCustomForm) {
      if (!isFormComplete) return toast.error('Responda todas as perguntas obrigatórias');
    } else {
      if (rating === 0) return toast.error('Selecione uma nota');
      if (comment.length < 50) return toast.error('O comentário deve ter no mínimo 50 caracteres');
    }

    const savedUser = localStorage.getItem('auth_fallback_user');
    if (!savedUser) return;
    const parsed = JSON.parse(savedUser);

    setSubmitting(true);
    try {
      const response = await fetch('/api/user/submit-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: parsed.email,
          accessKey: parsed.access_key || parsed.accessKey,
          evaluationId: selectedEval.id,
          rating: isCustomForm ? null : rating,
          comment: comment,
          answers: isCustomForm ? answers : null
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Avaliação enviada com sucesso!');
      setSelectedEval(null);
      setRating(0);
      setComment('');
      setAnswers({});
      setIsFormComplete(false);
      window.location.reload(); // Simple way to refresh data
    } catch (error: any) {
      toast.error('Erro ao enviar avaliação: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando avaliações...</div>;

  const currentForm = selectedEval?.form_id ? forms.find((f: any) => f.id === selectedEval.form_id) : null;
  const currentQuestions = selectedEval?.form_id ? formQuestions.filter((q: any) => q.form_id === selectedEval.form_id) : [];

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minhas Avaliações</h1>
          <p className="text-muted-foreground">Avalie seus colegas e acompanhe suas pendências.</p>
        </div>
        
        {currentUser && (
          <div className="flex items-center gap-4 bg-white p-3 pr-6 rounded-2xl border shadow-sm">
            <Avatar className="h-12 w-12 border-2 border-primary/10">
              <AvatarImage src={currentUser.photo_url} />
              <AvatarFallback className="bg-primary/5 text-primary font-bold">
                {currentUser.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight">{currentUser.name}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {currentUser.department || 'Geral'} • {currentUser.role === 'admin' ? 'Admin' : 'Colaborador'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* List of Pending */}
        <div className="md:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Clock className="mr-2 h-5 w-5 text-amber-500" /> Pendentes ({pendingEvaluations.length})
          </h2>
          {pendingEvaluations.length === 0 ? (
            <Card className="bg-slate-50 border-dashed">
              <CardContent className="p-6 text-center text-muted-foreground">
                Tudo em dia! Nenhuma avaliação pendente.
              </CardContent>
            </Card>
          ) : (
            pendingEvaluations.map(e => (
              <Card 
                key={e.id} 
                className={cn(
                  "cursor-pointer transition-all hover:border-primary overflow-hidden",
                  selectedEval?.id === e.id && "border-primary ring-1 ring-primary"
                )}
                onClick={() => setSelectedEval(e)}
              >
                <CardContent className="p-4 flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {e.evaluated_id === 'activity_mapping' || e.evaluated_id === 'organizational' ? (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <FileText className="h-6 w-6" />
                        </div>
                      ) : (
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage src={e.evaluated_photo_url} />
                          <AvatarFallback className="text-[10px] font-bold">
                            {e.evaluated_name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="font-bold text-lg">{e.evaluated_name}</span>
                    </div>
                    <Button variant="outline" size="sm" className="h-8">Avaliar</Button>
                  </div>
                  {e.evaluated_id !== 'activity_mapping' && e.evaluated_id !== 'organizational' && (
                    <div className="flex flex-wrap gap-2 pl-11">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 font-normal">
                        {e.evaluated_role === 'admin' ? 'Administrador' : 'Colaborador'}
                      </Badge>
                      {e.evaluated_department && (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 font-normal">
                          {e.evaluated_department}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          <h2 className="text-lg font-semibold flex items-center pt-4">
            <ClipboardCheck className="mr-2 h-5 w-5 text-green-500" /> Realizadas ({completedEvaluations.length})
          </h2>
          <div className="space-y-2">
            {completedEvaluations.map(e => (
              <div key={e.id} className="flex flex-col p-3 bg-slate-50 rounded-lg text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">{e.evaluated_name}</span>
                  <Badge variant="outline" className="bg-white border-green-200 text-green-700">Concluído</Badge>
                </div>
                {e.completed_at && (
                  <span className="text-[10px] text-muted-foreground mt-1">
                    Realizada em: {new Date(e.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Evaluation Form */}
        <div className="md:col-span-2">
          {selectedEval ? (
            <div className="space-y-6">
              <Card className="border-t-4 border-t-primary shadow-lg">
                <CardHeader>
                  <CardTitle>
                    {selectedEval.evaluated_id === 'activity_mapping' ? 'Preenchendo: ' : 'Avaliando: '}
                    {selectedEval.evaluated_name}
                  </CardTitle>
                  <CardDescription>
                    {currentForm ? currentForm.description || "Preencha o formulário personalizado abaixo." : "Sua avaliação é anônima. Seja honesto e construtivo."}
                  </CardDescription>
                </CardHeader>
              </Card>

              {currentForm ? (
                // Custom Form View
                <div className="space-y-6">
                  <DynamicFormRenderer 
                    questions={currentQuestions} 
                    onChange={(ans, complete) => {
                      setAnswers(ans);
                      setIsFormComplete(complete);
                    }} 
                  />

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <Label htmlFor="opinion" className="text-sm font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" /> 
                      {selectedEval.evaluated_id === 'activity_mapping' ? 'Considerações Finais sobre o Mapeamento' : 'Opinião Consultiva / Considerações Finais'}
                    </Label>
                    <Textarea 
                      id="opinion"
                      placeholder={selectedEval.evaluated_id === 'activity_mapping' 
                        ? "Descreva aqui eventuais observações sobre suas atividades ou rotina..."
                        : "Espaço livre para sua opinião construtiva sobre o desempenho geral do colega..."
                      }
                      className="min-h-[120px] bg-slate-50/50 border-slate-200 focus:bg-white transition-colors p-4 resize-none"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    {selectedEval.evaluated_id !== 'activity_mapping' && (
                      <p className="text-[10px] text-muted-foreground italic">
                        Sua opinião é fundamental para o desenvolvimento do colaborador. Seja específico e profissional.
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      className="w-full md:w-auto h-12 px-8" 
                      disabled={!isFormComplete || submitting}
                      onClick={handleSubmit}
                    >
                      <Send className="mr-2 h-4 w-4" /> 
                      {submitting ? 'Enviando...' : (selectedEval.evaluated_id === 'activity_mapping' ? 'Finalizar Mapeamento' : 'Finalizar Avaliação')}
                    </Button>
                  </div>
                </div>
              ) : (
                // Legacy View (No longer used for new cycles, but kept for compatibility)
                <Card className="shadow-lg border-amber-200 bg-amber-50">
                  <CardContent className="p-12 text-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
                    <h3 className="text-lg font-bold">Avaliação sem formulário definido</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Esta avaliação utiliza o sistema antigo. Por favor, solicite ao administrador para utilizar os novos ciclos baseados em formulários qualitativos.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-slate-50 rounded-xl border-2 border-dashed p-12">
              <ClipboardCheck className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Selecione um colega ao lado</p>
              <p className="text-sm">Para iniciar uma nova avaliação.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
