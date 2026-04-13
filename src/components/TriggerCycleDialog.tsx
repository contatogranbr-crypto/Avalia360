import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Form } from '../types';
import { ShieldAlert, RefreshCw, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface TriggerCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  forms: Form[];
  onTrigger: (payload: { formId: string; evaluatorIds: string[]; evaluatedIds: string[] }) => Promise<void>;
  onTriggerLegacy: () => Promise<void>;
  defaultFormId?: string;
}

export const TriggerCycleDialog: React.FC<TriggerCycleDialogProps> = ({ open, onOpenChange, users, forms, onTrigger, onTriggerLegacy, defaultFormId }) => {
  const [loading, setLoading] = useState(false);
  const [cycleType, setCycleType] = useState<'legacy' | 'custom'>(defaultFormId ? 'custom' : 'legacy');
  const [selectedFormId, setSelectedFormId] = useState<string>(defaultFormId || 'none');
  const [evaluatorIds, setEvaluatorIds] = useState<string[]>([]);
  const [evaluatedIds, setEvaluatedIds] = useState<string[]>([]);

  // Sync state when dialog opens with a default form
  React.useEffect(() => {
    if (open) {
      if (defaultFormId) {
        setCycleType('custom');
        setSelectedFormId(defaultFormId);
      } else {
        setCycleType('legacy');
        setSelectedFormId('none');
      }
      // Clear selections when opening
      setEvaluatorIds([]);
      setEvaluatedIds([]);
    }
  }, [open, defaultFormId]);

  const activeEmployees = users.filter(u => u.status === 'active' && u.role !== 'admin');

  const toggleEvaluator = (uid: string) => {
    setEvaluatorIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const toggleEvaluated = (uid: string) => {
    setEvaluatedIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const selectAllEvaluators = () => setEvaluatorIds(activeEmployees.map(u => u.uid));
  const selectAllEvaluated = () => setEvaluatedIds(activeEmployees.map(u => u.uid));
  const clearEvaluators = () => setEvaluatorIds([]);
  const clearEvaluated = () => setEvaluatedIds([]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (cycleType === 'legacy') {
        await onTriggerLegacy();
      } else {
        if (evaluatorIds.length === 0 || evaluatedIds.length === 0) {
          toast.error('Selecione pelo menos um avaliador e um avaliado.');
          setLoading(false);
          return;
        }
        await onTrigger({
          formId: selectedFormId === 'none' ? '' : selectedFormId,
          evaluatorIds,
          evaluatedIds
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Iniciar Novo Ciclo de Avaliação</DialogTitle>
          <DialogDescription>Configure o formato do ciclo de avaliação e quem participará.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              type="button"
              variant={cycleType === 'legacy' ? 'default' : 'outline'} 
              className={cycleType === 'legacy' ? 'border-primary ring-2 ring-primary/20 bg-primary/10 text-primary hover:bg-primary/20' : 'h-14'}
              onClick={() => setCycleType('legacy')}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Ciclo 360 Padrão
            </Button>
            <Button 
              type="button"
              variant={cycleType === 'custom' ? 'default' : 'outline'} 
              className={cycleType === 'custom' ? 'border-primary ring-2 ring-primary/20 bg-primary/10 text-primary hover:bg-primary/20' : 'h-14'}
              onClick={() => setCycleType('custom')}
            >
              <Layers className="mr-2 h-4 w-4" /> Ciclo Personalizado
            </Button>
          </div>

          {cycleType === 'legacy' ? (
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 flex gap-3 text-amber-800 text-sm">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <p>O ciclo padrão gera avaliações para <strong>todos os colaboradores ativos validarem todos os outros colegas</strong>. Todos receberão o questionário padrão (Nota de 1 a 5 + Comentário).</p>
            </div>
          ) : (
            <div className="space-y-6 border-t pt-4">
              <div className="space-y-2">
                <Label>Formulário a ser utilizado</Label>
                <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um formulário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Padrão (Nota 1-5 e Comentário)</SelectItem>
                    {forms.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-slate-100 p-2 rounded">
                    <Label className="font-bold">Avaliadores ({evaluatorIds.length})</Label>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAllEvaluators} className="text-xs text-primary hover:underline">Todos</button>
                      <button type="button" onClick={clearEvaluators} className="text-xs text-muted-foreground hover:underline">Limpar</button>
                    </div>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto space-y-2 border rounded p-2">
                    {activeEmployees.map(u => (
                      <div key={`evaluator-${u.uid}`} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`evaluator-${u.uid}`} 
                          checked={evaluatorIds.includes(u.uid)}
                          onCheckedChange={() => toggleEvaluator(u.uid)}
                        />
                        <Label htmlFor={`evaluator-${u.uid}`} className="text-sm font-normal cursor-pointer leading-none">
                          {u.name} <span className="text-[10px] text-muted-foreground">({u.department || 'Sem setor'})</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-slate-100 p-2 rounded">
                    <Label className="font-bold">Avaliação Sobre (Alvos) ({evaluatedIds.length})</Label>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAllEvaluated} className="text-xs text-primary hover:underline">Todos</button>
                      <button type="button" onClick={clearEvaluated} className="text-xs text-muted-foreground hover:underline">Limpar</button>
                    </div>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto space-y-2 border rounded p-2">
                    {activeEmployees.map(u => (
                      <div key={`target-${u.uid}`} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`target-${u.uid}`} 
                          checked={evaluatedIds.includes(u.uid)}
                          onCheckedChange={() => toggleEvaluated(u.uid)}
                        />
                        <Label htmlFor={`target-${u.uid}`} className="text-sm font-normal cursor-pointer leading-none">
                          {u.name} <span className="text-[10px] text-muted-foreground">({u.department || 'Sem setor'})</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Iniciando...' : (cycleType === 'legacy' ? 'Confirmar Ciclo 360' : 'Criar Avaliações')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
