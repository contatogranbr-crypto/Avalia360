import { useState } from 'react';
import { supabase } from '../supabase';
import { useEvaluations } from '../hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Star, ClipboardCheck, Clock, Send, UserCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export const EmployeeDashboard = () => {
  const { pendingEvaluations, completedEvaluations, loading } = useEvaluations();
  const [selectedEval, setSelectedEval] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return toast.error('Selecione uma nota');
    if (comment.length < 50) return toast.error('O comentário deve ter no mínimo 50 caracteres');

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
          rating,
          comment
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Avaliação enviada com sucesso!');
      setSelectedEval(null);
      setRating(0);
      setComment('');
      window.location.reload(); // Simple way to refresh data
    } catch (error: any) {
      toast.error('Erro ao enviar avaliação: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando avaliações...</div>;

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Minhas Avaliações</h1>
        <p className="text-muted-foreground">Avalie seus colegas e acompanhe suas pendências.</p>
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
                  "cursor-pointer transition-all hover:border-primary",
                  selectedEval?.id === e.id && "border-primary ring-1 ring-primary"
                )}
                onClick={() => setSelectedEval(e)}
              >
                <CardContent className="p-4 flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <UserCircle className="h-8 w-8 text-slate-400" />
                      <span className="font-bold text-lg">{e.evaluated_name}</span>
                    </div>
                    <Button variant="outline" size="sm" className="h-8">Avaliar</Button>
                  </div>
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
            <Card className="border-t-4 border-t-primary shadow-lg">
              <CardHeader>
                <CardTitle>Avaliando: {selectedEval.evaluated_name}</CardTitle>
                <CardDescription>
                  Sua avaliação é anônima. Seja honesto e construtivo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Nota Geral (1 a 5 estrelas)</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={cn(
                          "p-2 rounded-md transition-colors",
                          rating >= star ? "text-amber-400" : "text-slate-200 hover:text-slate-300"
                        )}
                      >
                        <Star className="h-8 w-8 fill-current" />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    {rating === 1 && "Muito abaixo do esperado"}
                    {rating === 2 && "Abaixo do esperado"}
                    {rating === 3 && "Dentro do esperado"}
                    {rating === 4 && "Acima do esperado"}
                    {rating === 5 && "Excelente"}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Comentário Obrigatório (Mínimo 50 caracteres)</label>
                  <Textarea 
                    placeholder="Descreva o desempenho do colaborador, pontos fortes e oportunidades de melhoria..."
                    className="min-h-[150px]"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                  <div className="flex justify-between items-center">
                    <span className={cn(
                      "text-xs font-medium",
                      comment.length >= 50 ? "text-green-600" : "text-amber-600"
                    )}>
                      {comment.length} / 50 caracteres
                    </span>
                    {comment.length < 50 && (
                      <span className="text-xs text-muted-foreground flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" /> Faltam {50 - comment.length}
                      </span>
                    )}
                  </div>
                </div>

                <Button 
                  className="w-full h-12" 
                  disabled={rating === 0 || comment.length < 50 || submitting}
                  onClick={handleSubmit}
                >
                  <Send className="mr-2 h-4 w-4" /> 
                  {submitting ? 'Enviando...' : 'Finalizar Avaliação'}
                </Button>
              </CardContent>
            </Card>
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
