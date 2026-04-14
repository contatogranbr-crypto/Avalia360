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
      {questions.map((q, index) => {
        // Support both explicit category field AND "Category: Question" prefix
        let category = q.category;
        let questionText = q.question_text;

        if (!category && questionText.includes(': ')) {
          const parts = questionText.split(': ');
          // Basic heuristic: if the first part is short and in Title Case, it's likely a category
          if (parts[0].length < 40) {
            category = parts[0];
            questionText = parts.slice(1).join(': ');
          }
        }

        const showCategoryHeader = category && (index === 0 || (
          // Compare categories, parsing the previous one if needed
          (() => {
            const prevQ = questions[index - 1];
            let prevCat = prevQ.category;
            if (!prevCat && prevQ.question_text.includes(': ')) {
              const p = prevQ.question_text.split(': ');
              if (p[0].length < 40) prevCat = p[0];
            }
            return prevCat !== category;
          })()
        ));
        
        return (
          <React.Fragment key={q.id || index}>
            {showCategoryHeader && (
              <div className="pt-6 pb-2 border-b-2 border-primary/20 mb-4 first:pt-0">
                <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  {category}
                </h3>
              </div>
            )}
            
            <div className="space-y-3 bg-white p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Label className="text-base font-semibold flex gap-1">
                <span className="text-muted-foreground/60">{index + 1}.</span> 
                <span>{questionText}</span>
                {q.required && <span className="text-red-500">*</span>}
              </Label>

              {q.question_type === 'short_text' && (
                <Input 
                  placeholder="Sua resposta" 
                  value={answers[q.id!] || ''} 
                  onChange={e => setAnswer(q.id!, e.target.value)} 
                />
              )}

              {/* ... existing types ... */}
              {q.question_type === 'paragraph' && (
                <Textarea 
                  placeholder="Sua resposta" 
                  className="min-h-[100px]"
                  value={answers[q.id!] || ''} 
                  onChange={e => setAnswer(q.id!, e.target.value)} 
                />
              )}

              {q.question_type === 'multiple_choice' && (
                <RadioGroup 
                  value={answers[q.id!] || ""} 
                  onValueChange={v => setAnswer(q.id!, v)} 
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                >
                  {q.options?.map((opt: string, i: number) => (
                    <div 
                      key={i} 
                      onClick={() => setAnswer(q.id!, opt)}
                      className={cn(
                        "flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer group",
                        answers[q.id!] === opt 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200"
                      )}
                    >
                      <RadioGroupItem 
                        value={opt} 
                        id={`${q.id}-${i}`} 
                        className="scale-110" 
                        _groupValue={answers[q.id!] || ""} 
                        _onGroupChange={v => setAnswer(q.id!, v)}
                      />
                      <Label 
                        htmlFor={`${q.id}-${i}`} 
                        className="font-medium cursor-pointer text-sm flex-1 leading-tight select-none"
                      >
                        {opt}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {q.question_type === 'checkboxes' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options?.map((opt: string, i: number) => {
                    const isChecked = (answers[q.id!] || []).includes(opt);
                    return (
                      <div 
                        key={i} 
                        onClick={() => toggleArrayAnswer(q.id!, opt)}
                        className={cn(
                          "flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer group",
                          isChecked 
                            ? "border-primary bg-primary/5 shadow-sm" 
                            : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200"
                        )}
                      >
                        <Checkbox 
                          id={`${q.id}-${i}`} 
                          checked={isChecked} 
                          onCheckedChange={() => {}} // Controlled by div click
                          className="scale-110"
                        />
                        <Label 
                          htmlFor={`${q.id}-${i}`} 
                          className="font-medium cursor-pointer text-sm flex-1 leading-tight select-none"
                        >
                          {opt}
                        </Label>
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
                  <div className="flex justify-between px-2 text-xs text-muted-foreground mb-4">
                    <span>Ruim (1)</span>
                    <span>Excelente (5)</span>
                  </div>
                  <RadioGroup 
                    value={String(answers[q.id!])} 
                    onValueChange={v => setAnswer(q.id!, parseInt(v))} 
                    className="flex justify-between items-center px-4"
                  >
                    {[1, 2, 3, 4, 5].map((val) => (
                      <div key={val} className="flex flex-col items-center space-y-2">
                        <RadioGroupItem 
                          value={String(val)} 
                          id={`${q.id}-${val}`} 
                          className="w-6 h-6" 
                          _groupValue={String(answers[q.id!])} 
                          _onGroupChange={v => setAnswer(q.id!, parseInt(v))}
                        />
                        <Label htmlFor={`${q.id}-${val}`} className="font-medium cursor-pointer">{val}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {q.question_type === 'rating' && (
                <div className="flex space-x-2 pt-1 text-center justify-center">
                  {[1, 2, 3, 4, 5].map(star => {
                    const currentRating = answers[q.id!] || 0;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setAnswer(q.id!, star)}
                        className={cn(
                          "p-2 rounded-lg transition-all transform hover:scale-110",
                          currentRating >= star ? "text-amber-400" : "text-slate-200"
                        )}
                      >
                        <Star className={cn("h-10 w-10", currentRating >= star ? "fill-current" : "fill-none")} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
