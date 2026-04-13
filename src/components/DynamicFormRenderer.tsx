import React, { useState, useEffect } from 'react';
import { FormQuestion } from '../types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DynamicFormRendererProps {
  questions: FormQuestion[];
  onChange: (answers: Record<string, any>, isComplete: boolean) => void;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({ questions, onChange }) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    // Validate if all required questions have answers
    const isComplete = questions.every(q => {
      if (!q.required) return true;
      const ans = answers[q.id!];
      if (ans === undefined || ans === null || ans === '') return false;
      if (Array.isArray(ans) && ans.length === 0) return false;
      return true;
    });

    onChange(answers, isComplete);
  }, [answers, questions]);

  const setAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleArrayAnswer = (questionId: string, value: string) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (current.includes(value)) {
        return { ...prev, [questionId]: current.filter((v: string) => v !== value) };
      }
      return { ...prev, [questionId]: [...current, value] };
    });
  };

  return (
    <div className="space-y-8">
      {questions.map((q, index) => (
        <div key={q.id!} className="space-y-3 bg-white p-6 border rounded-lg shadow-sm">
          <Label className="text-base font-semibold flex gap-1">
            <span>{index + 1}.</span> 
            <span>{q.question_text}</span>
            {q.required && <span className="text-red-500">*</span>}
          </Label>

          {q.question_type === 'short_text' && (
            <Input 
              placeholder="Sua resposta" 
              value={answers[q.id!] || ''} 
              onChange={e => setAnswer(q.id!, e.target.value)} 
            />
          )}

          {q.question_type === 'paragraph' && (
            <Textarea 
              placeholder="Sua resposta" 
              className="min-h-[100px]"
              value={answers[q.id!] || ''} 
              onChange={e => setAnswer(q.id!, e.target.value)} 
            />
          )}

          {q.question_type === 'multiple_choice' && (
            <RadioGroup value={answers[q.id!]} onValueChange={v => setAnswer(q.id!, v)} className="space-y-2">
              {q.options?.map((opt: string, i: number) => (
                <div key={i} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt} id={`${q.id}-${i}`} />
                  <Label htmlFor={`${q.id}-${i}`} className="font-normal cursor-pointer text-sm">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {q.question_type === 'checkboxes' && (
            <div className="space-y-2">
              {q.options?.map((opt: string, i: number) => {
                const isChecked = (answers[q.id!] || []).includes(opt);
                return (
                  <div key={i} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`${q.id}-${i}`} 
                      checked={isChecked} 
                      onCheckedChange={() => toggleArrayAnswer(q.id!, opt)} 
                    />
                    <Label htmlFor={`${q.id}-${i}`} className="font-normal cursor-pointer text-sm">{opt}</Label>
                  </div>
                );
              })}
            </div>
          )}

          {q.question_type === 'dropdown' && (
            <Select value={answers[q.id!]} onValueChange={v => setAnswer(q.id!, v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma opção" />
              </SelectTrigger>
              <SelectContent>
                {q.options?.map((opt: string, i: number) => (
                  <SelectItem key={i} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {q.question_type === 'linear_scale' && (
            <div className="pt-2">
              <div className="flex justify-between px-2 text-xs text-muted-foreground mb-2">
                <span>Pior (1)</span>
                <span>Melhor (5)</span>
              </div>
              <RadioGroup 
                value={String(answers[q.id!])} 
                onValueChange={v => setAnswer(q.id!, parseInt(v))} 
                className="flex justify-between items-center px-4"
              >
                {[1, 2, 3, 4, 5].map((val) => (
                  <div key={val} className="flex flex-col items-center space-y-1">
                    <RadioGroupItem value={String(val)} id={`${q.id}-${val}`} className="w-5 h-5" />
                    <Label htmlFor={`${q.id}-${val}`} className="font-normal cursor-pointer">{val}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {q.question_type === 'rating' && (
            <div className="flex space-x-2 pt-1">
              {[1, 2, 3, 4, 5].map(star => {
                const currentRating = answers[q.id!] || 0;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setAnswer(q.id!, star)}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      currentRating >= star ? "text-amber-400" : "text-slate-200 hover:text-slate-300"
                    )}
                  >
                    <Star className="h-8 w-8 fill-current" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
