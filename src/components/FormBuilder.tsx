import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Trash2, GripVertical, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { FormQuestion } from '../types';

interface FormBuilderProps {
  onCancel: () => void;
  onSave: (form: { title: string; description: string; questions: FormQuestion[] }) => void;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({ onCancel, onSave }) => {
  const [title, setTitle] = useState('Novo Formulário de Avaliação');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<FormQuestion[]>([{
    question_text: 'Pergunta sem título',
    question_type: 'multiple_choice',
    options: ['Opção 1'],
    required: true,
  }]);

  const addQuestion = () => {
    setQuestions([...questions, {
      question_text: '',
      question_type: 'multiple_choice',
      options: ['Opção 1'],
      required: true,
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) return toast.error('O formulário deve ter no mínimo uma pergunta.');
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, updates: Partial<FormQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const q = questions[qIndex];
    if (!q.options) return;
    updateQuestion(qIndex, { options: [...q.options, `Opção ${q.options.length + 1}`] });
  };

  const updateOption = (qIndex: number, oIndex: number, val: string) => {
    const q = questions[qIndex];
    if (!q.options) return;
    const newOpts = [...q.options];
    newOpts[oIndex] = val;
    updateQuestion(qIndex, { options: newOpts });
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const q = questions[qIndex];
    if (!q.options || q.options.length === 1) return;
    const newOpts = q.options.filter((_: any, i: number) => i !== oIndex);
    updateQuestion(qIndex, { options: newOpts });
  };

  const handleSave = () => {
    if (!title.trim()) return toast.error('O formulário precisa de um título.');
    const hasEmptyText = questions.some(q => !q.question_text.trim());
    if (hasEmptyText) return toast.error('Todas as perguntas devem ter um título.');

    onSave({ title, description, questions });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="border-t-8 border-t-primary">
        <CardContent className="pt-6 space-y-4">
          <div>
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="text-3xl font-bold border-none px-0 h-auto rounded-none border-b focus-visible:ring-0 focus-visible:border-primary"
              placeholder="Título do Formulário" 
            />
          </div>
          <div>
            <Input 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="text-sm border-none px-0 focus-visible:ring-0 text-muted-foreground"
              placeholder="Descrição do formulário (opcional)" 
            />
          </div>
        </CardContent>
      </Card>

      {questions.map((q, qIndex) => (
        <Card key={qIndex} className="relative group">
          <div className="absolute left-0 top-1/2 -mt-4 w-6 h-8 flex cursor-move items-center justify-center opacity-0 group-hover:opacity-100 text-slate-400">
            <GripVertical className="h-4 w-4" />
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <Input 
                  value={q.question_text} 
                  onChange={e => updateQuestion(qIndex, { question_text: e.target.value })} 
                  className="bg-slate-50 font-medium"
                  placeholder="Pergunta" 
                />
              </div>
              <div className="w-[200px]">
                <Select value={q.question_type} onValueChange={(v: any) => updateQuestion(qIndex, { question_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_text">Resposta curta</SelectItem>
                    <SelectItem value="paragraph">Parágrafo</SelectItem>
                    <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
                    <SelectItem value="checkboxes">Caixas de seleção</SelectItem>
                    <SelectItem value="dropdown">Lista suspensa</SelectItem>
                    <SelectItem value="linear_scale">Escala linear (1 a 5)</SelectItem>
                    <SelectItem value="rating">Avaliação (Estrelas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Options Renderer */}
            {['multiple_choice', 'checkboxes', 'dropdown'].includes(q.question_type) && (
              <div className="space-y-2 pl-2">
                {q.options?.map((opt: string, oIndex: number) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    {q.question_type === 'multiple_choice' && <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                    {q.question_type === 'checkboxes' && <div className="w-4 h-4 rounded-sm border-2 border-slate-300" />}
                    {q.question_type === 'dropdown' && <span className="text-slate-400 text-xs w-4">{oIndex + 1}.</span>}
                    <Input 
                      value={opt} 
                      onChange={e => updateOption(qIndex, oIndex, e.target.value)} 
                      className="h-8 border-transparent hover:border-slate-200 focus-visible:border-primary flex-1 bg-transparent"
                    />
                    <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100" onClick={() => removeOption(qIndex, oIndex)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="ghost" size="sm" className="text-primary h-8" onClick={() => addOption(qIndex)}>
                    Adicionar opção
                  </Button>
                </div>
              </div>
            )}

            {q.question_type === 'linear_scale' && (
              <div className="flex items-center gap-4 py-4 px-2 text-slate-500">
                <span>1 (Ruim)</span>
                <div className="flex-1 flex justify-between px-4">
                  {[1,2,3,4,5].map(i => <div key={i} className="w-4 h-4 rounded-full bg-slate-200" />)}
                </div>
                <span>5 (Excelente)</span>
              </div>
            )}

            {q.question_type === 'short_text' && (
              <div className="border-b border-dashed border-slate-300 w-1/2 py-2 mt-2" />
            )}
            {q.question_type === 'paragraph' && (
              <div className="border-b border-dashed border-slate-300 w-full py-2 mt-2" />
            )}

            <div className="flex items-center justify-end gap-6 pt-4 border-t mt-4 text-sm">
              <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} className="text-slate-500 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <Label className="font-normal text-slate-600">Obrigatória</Label>
                <Switch checked={q.required} onCheckedChange={c => updateQuestion(qIndex, { required: c })} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-center mt-6">
        <Button variant="outline" size="lg" onClick={addQuestion} className="gap-2 bg-white rounded-full shadow-sm">
          <PlusCircle className="h-5 w-5" /> Adicionar Pergunta
        </Button>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t mt-8 sticky bottom-4 bg-slate-50 p-4 rounded-xl shadow-lg">
        <Button variant="outline" onClick={onCancel}>Sair</Button>
        <Button onClick={handleSave} className="gap-2"><CheckCircle className="h-4 w-4" /> Salvar Formulário</Button>
      </div>
    </div>
  );
};
