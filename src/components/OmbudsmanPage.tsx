import * as React from 'react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ShieldCheck, Send, Search, ClipboardList, CheckCircle2, AlertCircle, ArrowLeft, User, Mail, MessageSquare, SendHorizontal, RefreshCw, Paperclip, X, FileIcon, ImageIcon, FilmIcon, Loader2, Download } from 'lucide-react';
import { submitComplaint, trackComplaint, uploadOmbudsmanFile, submitComplaintReply } from '../services';
import { toast } from 'sonner';
import { Badge } from './ui/badge';

interface AttachmentDisplayProps {
  url: string;
}

const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({ url }) => {
  const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)/i);
  const isVideo = url.match(/\.(mp4|webm|mov)/i);
  const isPDF = url.match(/\.pdf/i);

  if (isImage) {
    return (
      <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 bg-white max-w-sm">
        <img src={url} alt="Anexo" className="w-full h-auto cursor-pointer" onClick={() => window.open(url, '_blank')} />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 bg-white max-w-sm">
        <video src={url} controls className="w-full h-auto" />
      </div>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="mt-2 gap-2 text-xs"
      onClick={() => window.open(url, '_blank')}
    >
      {isPDF ? <FileIcon className="w-4 h-4 text-red-500" /> : <Paperclip className="w-4 h-4" />}
      Ver Documento
      <Download className="w-3 h-3 ml-1" />
    </Button>
  );
};

export const OmbudsmanPage = ({ onBack }: { onBack: () => void }) => {
  const [activeTab, setActiveTab] = useState('submit');
  const [loading, setLoading] = useState(false);
  const [protocolResult, setProtocolResult] = useState<string | null>(null);
  
  // Submit Form State
  const [formData, setFormData] = useState({
    type: 'reclamacao',
    subject: '',
    description: '',
    is_anonymous: true,
    contact_email: '',
  });

  // Track State
  const [protocolInput, setProtocolInput] = useState('');
  const [trackedComplaint, setTrackedComplaint] = useState<any>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  // Attachments State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.description) {
      return toast.error('Por favor, preencha o assunto e a descrição.');
    }

    setLoading(true);
    try {
      // 1. Upload files first if any
      let attachmentUrls: string[] = [];
      if (selectedFiles.length > 0) {
        setUploading(true);
        attachmentUrls = await Promise.all(selectedFiles.map(async (file) => {
          try {
            return await uploadOmbudsmanFile(file);
          } catch (uploadError: any) {
            console.error('Falha no upload do arquivo:', file.name, uploadError);
            throw new Error(`Não foi possível enviar o arquivo "${file.name}". Verifique se o tamanho é menor que 10MB.`);
          }
        }));
        setUploading(false);
      }

      // 2. Submit complaint
      const result = await submitComplaint({
        ...formData,
        attachments: attachmentUrls
      });
      setProtocolResult(result.protocol);
      setFormData({ type: 'reclamacao', subject: '', description: '', is_anonymous: true, contact_email: '' });
      setSelectedFiles([]);
      toast.success('Relato enviado com sucesso!');
    } catch (error: any) {
      console.error('Erro detalhado no envio:', error);
      toast.error(error.message || 'Erro ao enviar o relato. Tente novamente.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!protocolInput) return;

    setLoading(true);
    try {
      const normalizedProtocol = protocolInput.trim().toUpperCase();
      const complaint = await trackComplaint(normalizedProtocol);
      setTrackedComplaint(complaint);
    } catch (error: any) {
      toast.error(error.message);
      setTrackedComplaint(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente': return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case 'em_analise': return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Em Análise</Badge>;
      case 'resolvido': return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Resolvido</Badge>;
      case 'arquivado': return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">Arquivado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Voltar para o Login
        </Button>

        <div className="text-center space-y-3 mb-8">
          <div className="flex justify-center">
            <div className="relative">
              <img 
                src="https://twxdjqsggoavycuudwzt.supabase.co/storage/v1/object/public/system/logo.png" 
                className="h-16 w-auto object-contain mx-auto"
                alt="Logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                }}
              />
              <div className="p-3 bg-primary/10 rounded-full hidden">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ouvidoria - Gran Bernardo</h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            Este é um espaço seguro e sigiloso para você enviar reclamações, sugestões ou elogios. 
            Seu relato pode ser feito de forma totalmente anônima.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="submit" className="gap-2">
              <Send className="w-4 h-4" /> Enviar Relato
            </TabsTrigger>
            <TabsTrigger value="track" className="gap-2">
              <Search className="w-4 h-4" /> Acompanhar Protocolo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submit">
            {protocolResult ? (
              <Card className="border-green-200 bg-green-50 shadow-lg animate-in fade-in zoom-in duration-300">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-green-800">Relato Enviado!</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6 py-6">
                  <div className="p-6 bg-white rounded-xl border-2 border-dashed border-green-300 inline-block">
                    <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold mb-2">Seu Protocolo</p>
                    <p className="text-4xl font-mono font-bold text-slate-900">{protocolResult}</p>
                  </div>
                  <p className="text-slate-600 max-w-md mx-auto">
                    Guarde este número com cuidado. Ele é a única forma de você acompanhar o status e ler a nossa resposta 
                    {formData.is_anonymous ? ' (já que você escolheu o anonimato)' : ''}.
                  </p>
                  <Button variant="outline" onClick={() => setProtocolResult(null)} className="mt-4">
                    Enviar outro relato
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle>Novo Relato</CardTitle>
                  <CardDescription>Preencha os detalhes abaixo para iniciar sua solicitação.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Tipo de Relato</Label>
                        <Select 
                          value={formData.type} 
                          onValueChange={(val) => setFormData({...formData, type: val})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reclamacao">Reclamação</SelectItem>
                            <SelectItem value="sugestao">Sugestão</SelectItem>
                            <SelectItem value="elogio">Elogio</SelectItem>
                            <SelectItem value="denuncia">Denúncia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Assunto</Label>
                        <Input 
                          placeholder="Resumo do assunto" 
                          value={formData.subject}
                          onChange={e => setFormData({...formData, subject: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição Detalhada</Label>
                      <Textarea 
                        placeholder="Descreva aqui o que aconteceu, com o maior número de detalhes possível..."
                        className="min-h-[150px]"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        required
                      />
                    </div>

                    <div className="p-4 bg-slate-100 rounded-lg flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        id="is_anonymous"
                        className="mt-1 h-4 w-4"
                        checked={formData.is_anonymous}
                        onChange={e => setFormData({...formData, is_anonymous: e.target.checked})}
                      />
                      <Label htmlFor="is_anonymous" className="leading-tight cursor-pointer">
                        <span className="font-semibold block mb-1">Desejo permanecer anônimo</span>
                        <span className="text-xs text-slate-500 font-normal">
                          Ao marcar esta opção, seus dados de perfil não serão registrados. 
                          Você precisará apenas do protocolo para acompanhar o caso.
                        </span>
                      </Label>
                    </div>

                    {!formData.is_anonymous && (
                      <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label>E-mail para Retorno (Opcional)</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input 
                            type="email" 
                            placeholder="seu@email.com" 
                            className="pl-10"
                            value={formData.contact_email}
                            onChange={e => setFormData({...formData, contact_email: e.target.value})}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <Label className="text-slate-700 font-bold flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-primary" /> Anexar Documentos (Fotos, PDF, Vídeo)
                      </Label>
                      <div className="flex flex-wrap gap-3">
                        {selectedFiles.map((file, i) => (
                          <div key={i} className="relative bg-white border rounded-lg p-2 flex items-center gap-3 pr-8 min-w-[150px] shadow-sm">
                            <div className="bg-slate-50 p-1.5 rounded border">
                              {file.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-blue-500" /> : 
                               file.type.startsWith('video/') ? <FilmIcon className="w-4 h-4 text-purple-500" /> : 
                               <FileIcon className="w-4 h-4 text-slate-500" />}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-[10px] font-medium text-slate-600 truncate max-w-[100px]">{file.name}</span>
                              <span className="text-[9px] text-slate-400">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => removeFile(i)}
                              className="absolute right-1 top-1 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <label className="border-2 border-dashed border-slate-200 rounded-lg p-4 hover:border-primary hover:bg-slate-50 transition-all cursor-pointer flex flex-col items-center justify-center min-w-[150px] h-auto min-h-[64px]">
                          <input 
                            type="file" 
                            className="hidden" 
                            multiple 
                            accept="image/*,application/pdf,video/*"
                            onChange={(e) => {
                              if (e.target.files) {
                                setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                              }
                            }}
                          />
                          <Paperclip className="w-4 h-4 text-slate-400 mb-1" />
                          <span className="text-[10px] text-slate-500 font-medium">Clique para anexar</span>
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">Formatos suportados: Imagens, PDF e Vídeos (máx 10MB).</p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-lg font-bold gap-2 shadow-lg hover:shadow-xl transition-all" 
                      disabled={loading || uploading}
                    >
                      {loading || uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> 
                          {uploading ? 'Enviando arquivos...' : 'Processando...'}
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" /> Enviar Relato com Segurança
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="track">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle>Acompanhamento</CardTitle>
                <CardDescription>Insira seu número de protocolo para ver o andamento do seu relato.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <form onSubmit={handleTrack} className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="AV-YYYY-XXXX" 
                      className="pl-10 uppercase h-12 text-lg font-mono focus-visible:ring-primary"
                      value={protocolInput}
                      onChange={e => setProtocolInput(e.target.value)}
                    />
                  </div>
                  <Button type="submit" size="lg" className="h-12" disabled={loading}>
                    {loading ? 'Buscando...' : 'Buscar'}
                  </Button>
                </form>

                {trackedComplaint && (
                  <div className="space-y-6 border-t pt-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Status Atual</p>
                        {getStatusBadge(trackedComplaint.status)}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Última atualização em</p>
                        <p className="text-sm font-semibold">{new Date(trackedComplaint.updated_at).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-slate-400 uppercase text-[10px] tracking-widest font-bold">Resumo do Relato</Label>
                        <h3 className="text-xl font-bold mt-1">{trackedComplaint.subject}</h3>
                        <p className="text-xs text-slate-400 mt-1 capitalize">{trackedComplaint.type}</p>
                      </div>

                      {/* Conversation History */}
                      <div className="space-y-4 pt-4 border-t">
                        <Label className="text-slate-400 uppercase text-[10px] tracking-widest font-bold">Histórico do Chamado</Label>
                        
                        <div className="space-y-3">
                          {/* If no messages yet (old data), show description as user message */}
                          <div className="flex justify-start">
                            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 max-w-[85%] shadow-sm">
                              <p className="text-xs font-bold text-slate-500 mb-1">Você / Relato Inicial</p>
                              <p className="text-sm text-slate-800 whitespace-pre-wrap">{trackedComplaint.description || "Relato submetido."}</p>
                              
                              {trackedComplaint.attachments && trackedComplaint.attachments.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-200/50">
                                  <div className="flex flex-wrap gap-2">
                                    {trackedComplaint.attachments.map((url: string, i: number) => (
                                      <AttachmentDisplay url={url} key={`attach-${i}`} />
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <p className="text-[10px] text-slate-400 mt-2">{new Date(trackedComplaint.created_at).toLocaleString('pt-BR')}</p>
                            </div>
                          </div>

                          {trackedComplaint.messages?.map((msg: any, idx: number) => (
                            <div key={idx} className={`flex ${msg.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`${msg.role === 'admin' ? 'bg-primary/10 border-primary/20' : 'bg-slate-100 border-slate-200'} border rounded-2xl p-4 max-w-[85%] shadow-sm`}>
                                <p className={`text-xs font-bold mb-1 ${msg.role === 'admin' ? 'text-primary' : 'text-slate-500'}`}>
                                  {msg.role === 'admin' ? 'Administração' : 'Você'}
                                </p>
                                <p className="text-sm text-slate-800 whitespace-pre-wrap">{msg.content}</p>
                                
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className={`mt-3 pt-3 border-t ${msg.role === 'admin' ? 'border-primary/20' : 'border-slate-200/50'}`}>
                                    <div className="flex flex-wrap gap-2">
                                      {msg.attachments.map((url: string, j: number) => (
                                        <AttachmentDisplay url={url} key={`msg-attach-${j}`} />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <p className="text-[10px] text-slate-400 mt-2">{new Date(msg.timestamp).toLocaleString('pt-BR')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reply Form */}
                      {(trackedComplaint.status === 'resolvido' || trackedComplaint.status === 'arquivado') ? (
                        <div className="mt-8 bg-slate-100 p-6 rounded-2xl border border-slate-200 text-center">
                          <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                          <h3 className="text-slate-700 font-bold">Relato Encerrado</h3>
                          <p className="text-sm text-slate-500 mt-1">Este protocolo foi marcado como {trackedComplaint.status === 'resolvido' ? 'resolvido' : 'arquivado'}. Não é mais possível enviar novas mensagens.</p>
                        </div>
                      ) : (
                        <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
                          <Label className="text-slate-500 font-bold flex items-center gap-2 mb-3">
                            <SendHorizontal className="w-4 h-4" /> Enviar uma Resposta
                          </Label>
                          <div className="space-y-4">
                            <Textarea 
                              placeholder="Adicione mais detalhes ou responda à administração..."
                              className="bg-white border-slate-200 focus:ring-primary min-h-[100px]"
                              value={replyContent}
                              onChange={e => setReplyContent(e.target.value)}
                            />

                            {/* File Selection for Reply */}
                            <div className="flex flex-wrap gap-2">
                              {selectedFiles.map((file, i) => (
                                <div key={i} className="relative bg-white border rounded-lg p-1 px-2 flex items-center gap-2 pr-6 shadow-sm">
                                  {file.type.startsWith('image/') ? <ImageIcon className="w-3 h-3 text-blue-500" /> : <FileIcon className="w-3 h-3 text-slate-500" />}
                                  <span className="text-[9px] max-w-[80px] truncate">{file.name}</span>
                                  <button type="button" onClick={() => removeFile(i)} className="absolute right-1 top-1 text-slate-300 hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                                </div>
                              ))}
                              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors text-[10px] font-medium text-slate-600">
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  multiple 
                                  onChange={e => {
                                    if (e.target.files) {
                                      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                    }
                                  }} 
                                />
                                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                                Anexar Arquivos
                              </label>
                            </div>

                            <div className="flex justify-end">
                              <Button 
                                onClick={async () => {
                                  if (!replyContent.trim() && selectedFiles.length === 0) return;
                                  setReplying(true);
                                  try {
                                    // Upload files if any
                                    let attachmentUrls: string[] = [];
                                    if (selectedFiles.length > 0) {
                                      setUploading(true);
                                      try {
                                        attachmentUrls = await Promise.all(selectedFiles.map(async (file) => {
                                          try {
                                            return await uploadOmbudsmanFile(file);
                                          } catch (err: any) {
                                            console.error(`Erro no upload do arquivo ${file.name}:`, err);
                                            throw new Error(`Falha ao subir "${file.name}". Verifique sua conexão ou tente um arquivo menor.`);
                                          }
                                        }));
                                      } finally {
                                        setUploading(false);
                                      }
                                    }

                                    const complaint = await submitComplaintReply(
                                      trackedComplaint.protocol,
                                      replyContent,
                                      attachmentUrls
                                    );
                                    
                                    toast.success('Resposta enviada com sucesso!');
                                    setReplyContent('');
                                    setSelectedFiles([]);
                                    setTrackedComplaint(complaint);
                                  } catch (err: any) {
                                    toast.error('Erro ao responder: ' + err.message);
                                  } finally {
                                    setReplying(false);
                                    setUploading(false);
                                  }
                                }}
                                disabled={replying || uploading || (!replyContent.trim() && selectedFiles.length === 0)}
                                className="gap-2"
                              >
                                {replying || uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                                {uploading ? 'Enviando...' : 'Enviar Resposta'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
