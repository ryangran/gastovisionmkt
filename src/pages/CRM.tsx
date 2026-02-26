import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Plus, Check, Clock, Trash2, RefreshCw, Calendar, Repeat, Bot, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePagePermission } from "@/hooks/usePagePermission";
import { AccessDenied } from "@/components/AccessDenied";

interface Task {
  id: string;
  person_name: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  routine_id: string | null;
  frequency: string | null;
  is_auto_generated: boolean;
  scheduled_date: string | null;
}

interface PersonSection {
  name: string;
  color: string;
}

const people: PersonSection[] = [
  { name: "Ryan", color: "from-blue-500 to-blue-600" },
  { name: "Miria", color: "from-pink-500 to-pink-600" },
  { name: "Bianca", color: "from-purple-500 to-purple-600" },
  { name: "Marco", color: "from-green-500 to-green-600" },
  { name: "Marcilia", color: "from-amber-500 to-amber-600" },
];

const CRM = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({});
  const [newTaskDescription, setNewTaskDescription] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [ignoreDialogOpen, setIgnoreDialogOpen] = useState(false);
  const [taskToIgnore, setTaskToIgnore] = useState<Task | null>(null);
  const [ignoreReason, setIgnoreReason] = useState("");
  
  const { hasPermission, isLoading: permissionLoading, userEmail } = usePagePermission("/crm");

  useEffect(() => {
    if (hasPermission) {
      fetchTasks();

      const channel = supabase
        .channel('crm-tasks-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'crm_tasks' },
          () => fetchTasks()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [hasPermission]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('crm_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const generateTasks = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-crm-tasks');
      
      if (error) {
        console.error('Error generating tasks:', error);
        toast.error('Erro ao gerar tarefas automáticas');
      } else {
        toast.success(`${data.tasksCreated} tarefas criadas para ${data.dayOfWeek}`);
        fetchTasks();
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao gerar tarefas');
    } finally {
      setGenerating(false);
    }
  };

  const addTask = async (personName: string) => {
    const title = newTaskTitle[personName]?.trim();
    if (!title) {
      toast.error('Digite um título para a tarefa');
      return;
    }

    const { error } = await supabase.from('crm_tasks').insert({
      person_name: personName,
      title,
      description: newTaskDescription[personName]?.trim() || null,
      status: 'pending',
      is_auto_generated: false
    });

    if (error) {
      toast.error('Erro ao adicionar tarefa');
      console.error(error);
    } else {
      toast.success('Tarefa adicionada!');
      setNewTaskTitle(prev => ({ ...prev, [personName]: '' }));
      setNewTaskDescription(prev => ({ ...prev, [personName]: '' }));
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'pending' ? 'done' : 'pending';
    const { error } = await supabase
      .from('crm_tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (error) {
      toast.error('Erro ao atualizar tarefa');
      console.error(error);
    }
  };

  const openIgnoreDialog = (task: Task) => {
    setTaskToIgnore(task);
    setIgnoreReason("");
    setIgnoreDialogOpen(true);
  };

  const confirmIgnoreTask = async () => {
    if (!taskToIgnore) return;
    
    const descWithReason = taskToIgnore.description 
      ? `${taskToIgnore.description}\n\n⚠️ IGNORADA: ${ignoreReason || "Sem justificativa"}`
      : `⚠️ IGNORADA: ${ignoreReason || "Sem justificativa"}`;

    const { error } = await supabase
      .from('crm_tasks')
      .update({ 
        status: 'ignored',
        description: descWithReason
      })
      .eq('id', taskToIgnore.id);

    if (error) {
      toast.error('Erro ao ignorar tarefa');
      console.error(error);
    } else {
      toast.success('Tarefa marcada como ignorada');
    }
    
    setIgnoreDialogOpen(false);
    setTaskToIgnore(null);
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('crm_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      toast.error('Erro ao excluir tarefa');
      console.error(error);
    } else {
      toast.success('Tarefa excluída!');
    }
  };

  const getPersonTasks = (personName: string) => {
    return tasks.filter(t => t.person_name === personName);
  };

  const getPendingTasks = (personName: string) => {
    return getPersonTasks(personName).filter(t => t.status === 'pending');
  };

  const getDoneTasks = (personName: string) => {
    return getPersonTasks(personName).filter(t => t.status === 'done');
  };

  const getIgnoredTasks = (personName: string) => {
    return getPersonTasks(personName).filter(t => t.status === 'ignored');
  };

  const getFrequencyLabel = (frequency: string | null): string => {
    switch (frequency) {
      case 'daily': return 'Diária';
      case 'weekly': return 'Semanal';
      case 'monthly': return 'Mensal';
      case 'conditional': return 'Condicional';
      default: return '';
    }
  };

  const getFrequencyColor = (frequency: string | null): string => {
    switch (frequency) {
      case 'daily': return 'bg-blue-500/20 text-blue-500';
      case 'weekly': return 'bg-purple-500/20 text-purple-500';
      case 'monthly': return 'bg-amber-500/20 text-amber-500';
      case 'conditional': return 'bg-green-500/20 text-green-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const renderTaskCard = (task: Task, variant: 'pending' | 'done' | 'ignored') => {
    const bgClass = variant === 'done' 
      ? 'bg-green-500/10' 
      : variant === 'ignored' 
        ? 'bg-orange-500/10' 
        : 'bg-muted/50 hover:bg-muted';
    
    return (
      <div
        key={task.id}
        className={`flex items-start gap-3 p-4 rounded-lg ${bgClass} transition-colors group`}
      >
        {variant === 'pending' ? (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-6 w-6 rounded-full border-2"
            onClick={() => toggleTaskStatus(task)}
          >
            <span className="sr-only">Marcar como concluída</span>
          </Button>
        ) : variant === 'done' ? (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-6 w-6 rounded-full border-2 border-green-500 bg-green-500 text-white"
            onClick={() => toggleTaskStatus(task)}
          >
            <Check className="w-3 h-3" />
          </Button>
        ) : (
          <div className="shrink-0 h-6 w-6 rounded-full border-2 border-orange-500 bg-orange-500/20 flex items-center justify-center">
            <XCircle className="w-3 h-3 text-orange-500" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className={`font-medium ${variant !== 'pending' ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </p>
            {task.is_auto_generated && (
              <Badge variant="outline" className="text-xs gap-1 py-0">
                <Bot className="w-3 h-3" />
                Auto
              </Badge>
            )}
            {task.frequency && (
              <Badge className={`text-xs ${getFrequencyColor(task.frequency)}`}>
                <Repeat className="w-3 h-3 mr-1" />
                {getFrequencyLabel(task.frequency)}
              </Badge>
            )}
            {task.scheduled_date && (
              <Badge variant="outline" className="text-xs gap-1 py-0">
                <Calendar className="w-3 h-3" />
                {formatDate(task.scheduled_date)}
              </Badge>
            )}
          </div>
          {task.description && (
            <p className={`text-sm text-muted-foreground mt-1 ${variant !== 'pending' ? 'line-through' : ''} whitespace-pre-line`}>
              {task.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {variant === 'pending' && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500 hover:text-orange-600"
              onClick={() => openIgnoreDialog(task)}
              title="Ignorar tarefa"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            onClick={() => deleteTask(task.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (permissionLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasPermission) {
    return <AccessDenied userEmail={userEmail} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    CRM
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Gestão de Tarefas por Pessoa
                  </p>
                </div>
              </div>
            </div>
            <Button 
              onClick={generateTasks} 
              disabled={generating}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Gerando...' : 'Gerar Tarefas do Dia'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="Ryan" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-2 bg-transparent justify-start mb-6">
            {people.map((person) => (
              <TabsTrigger
                key={person.name}
                value={person.name}
                className={`px-6 py-3 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:${person.color} data-[state=active]:text-white transition-all`}
              >
                {person.name}
                <span className="ml-2 text-xs opacity-75">
                  ({getPendingTasks(person.name).length})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {people.map((person) => (
            <TabsContent key={person.name} value={person.name} className="space-y-6">
              {/* Header Card */}
              <Card className="overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${person.color}`} />
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className={`p-3 rounded-full bg-gradient-to-r ${person.color} text-white`}>
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-2xl">{person.name}</span>
                      <p className="text-sm text-muted-foreground font-normal">
                        {getPendingTasks(person.name).length} pendentes · {getDoneTasks(person.name).length} concluídas · {getIgnoredTasks(person.name).length} ignoradas
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Add Task Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Plus className="w-5 h-5" />
                    Nova Tarefa Manual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Título da tarefa..."
                    value={newTaskTitle[person.name] || ''}
                    onChange={(e) => setNewTaskTitle(prev => ({ ...prev, [person.name]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addTask(person.name)}
                  />
                  <Textarea
                    placeholder="Descrição (opcional)..."
                    value={newTaskDescription[person.name] || ''}
                    onChange={(e) => setNewTaskDescription(prev => ({ ...prev, [person.name]: e.target.value }))}
                    className="min-h-[80px]"
                  />
                  <Button 
                    onClick={() => addTask(person.name)}
                    className={`w-full bg-gradient-to-r ${person.color} hover:opacity-90`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Tarefa
                  </Button>
                </CardContent>
              </Card>

              {/* Pending Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5 text-amber-500" />
                    Tarefas Pendentes ({getPendingTasks(person.name).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <p className="text-muted-foreground text-center py-4">Carregando...</p>
                  ) : getPendingTasks(person.name).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Nenhuma tarefa pendente</p>
                  ) : (
                    getPendingTasks(person.name).map((task) => renderTaskCard(task, 'pending'))
                  )}
                </CardContent>
              </Card>

              {/* Done Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Check className="w-5 h-5 text-green-500" />
                    Tarefas Concluídas ({getDoneTasks(person.name).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getDoneTasks(person.name).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Nenhuma tarefa concluída</p>
                  ) : (
                    getDoneTasks(person.name).map((task) => renderTaskCard(task, 'done'))
                  )}
                </CardContent>
              </Card>

              {/* Ignored Tasks */}
              {getIgnoredTasks(person.name).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <XCircle className="w-5 h-5 text-orange-500" />
                      Tarefas Ignoradas ({getIgnoredTasks(person.name).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {getIgnoredTasks(person.name).map((task) => renderTaskCard(task, 'ignored'))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Ignore Dialog */}
      <AlertDialog open={ignoreDialogOpen} onOpenChange={setIgnoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ignorar Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, informe o motivo para ignorar esta tarefa:
              <span className="block mt-2 font-medium text-foreground">{taskToIgnore?.title}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Justificativa (opcional)..."
            value={ignoreReason}
            onChange={(e) => setIgnoreReason(e.target.value)}
            className="min-h-[80px] mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmIgnoreTask} className="bg-orange-500 hover:bg-orange-600">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CRM;
