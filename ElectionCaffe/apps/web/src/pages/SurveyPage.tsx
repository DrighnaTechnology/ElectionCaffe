import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Spinner } from '../components/ui/spinner';
import { toast } from 'sonner';
import {
  PlusIcon,
  SearchIcon,
  TrashIcon,
  ClipboardListIcon,
  UsersIcon,
  BarChart2Icon,
  EyeIcon,
  PlayIcon,
  StopCircleIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from 'lucide-react';

interface Survey {
  id: string;
  surveyName: string;
  description?: string;
  questions: any[];
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  _count?: {
    responses: number;
  };
}

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'text' | 'radio' | 'checkbox' | 'scale';
  options?: string[];
  required: boolean;
}

export function SurveyPage() {
  const { selectedElectionId } = useElectionStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    surveyName: '',
    description: '',
    startDate: '',
    endDate: '',
    questions: [] as SurveyQuestion[],
  });
  const [newQuestion, setNewQuestion] = useState<Partial<SurveyQuestion>>({
    text: '',
    type: 'radio',
    options: [],
    required: true,
  });
  const [optionInput, setOptionInput] = useState('');
  const queryClient = useQueryClient();

  const { data: surveysData, isLoading } = useQuery({
    queryKey: ['surveys', selectedElectionId],
    queryFn: () => api.get('/surveys', { params: { electionId: selectedElectionId } }),
    enabled: !!selectedElectionId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/surveys', data, { params: { electionId: selectedElectionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys', selectedElectionId] });
      toast.success('Survey created successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to create survey'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/surveys/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys', selectedElectionId] });
      toast.success('Survey status updated');
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to update survey'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/surveys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys', selectedElectionId] });
      toast.success('Survey deleted successfully');
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to delete survey'),
  });

  const resetForm = () => {
    setFormData({
      surveyName: '',
      description: '',
      startDate: '',
      endDate: '',
      questions: [],
    });
    setNewQuestion({ text: '', type: 'radio', options: [], required: true });
    setOptionInput('');
  };

  const addQuestion = () => {
    if (!newQuestion.text) {
      toast.error('Please enter question text');
      return;
    }
    if ((newQuestion.type === 'radio' || newQuestion.type === 'checkbox') && (!newQuestion.options || newQuestion.options.length < 2)) {
      toast.error('Please add at least 2 options');
      return;
    }

    const question: SurveyQuestion = {
      id: crypto.randomUUID(),
      text: newQuestion.text!,
      type: newQuestion.type as any,
      options: newQuestion.options,
      required: newQuestion.required ?? true,
    };

    setFormData({ ...formData, questions: [...formData.questions, question] });
    setNewQuestion({ text: '', type: 'radio', options: [], required: true });
    setOptionInput('');
  };

  const removeQuestion = (id: string) => {
    setFormData({ ...formData, questions: formData.questions.filter(q => q.id !== id) });
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setNewQuestion({
      ...newQuestion,
      options: [...(newQuestion.options || []), optionInput.trim()],
    });
    setOptionInput('');
  };

  const removeOption = (index: number) => {
    setNewQuestion({
      ...newQuestion,
      options: newQuestion.options?.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }
    createMutation.mutate(formData);
  };

  const surveys: Survey[] = surveysData?.data?.data || [];

  const filteredSurveys = surveys.filter((survey) =>
    survey.surveyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeSurveys = surveys.filter(s => s.isActive).length;
  const totalResponses = surveys.reduce((sum, s) => sum + (s._count?.responses || 0), 0);

  if (!selectedElectionId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircleIcon className="h-12 w-12 text-orange-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Election Selected</h2>
          <p className="text-gray-500">Please select an election from the sidebar to manage surveys.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Survey Manager</h1>
          <p className="text-gray-500">Create and manage voter surveys</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><PlusIcon className="h-4 w-4 mr-2" />Create Survey</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Survey</DialogTitle>
              <DialogDescription>Design your survey with questions for voters</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="surveyName">Survey Name *</Label>
                  <Input
                    id="surveyName"
                    placeholder="e.g., Voter Satisfaction Survey"
                    value={formData.surveyName}
                    onChange={(e) => setFormData({ ...formData, surveyName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Survey description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Questions ({formData.questions.length})</Label>
                </div>
                {formData.questions.map((q, idx) => (
                  <Card key={q.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">Q{idx + 1}. {q.text}</p>
                          <p className="text-sm text-gray-500 mt-1">Type: {q.type} | {q.required ? 'Required' : 'Optional'}</p>
                          {q.options && q.options.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {q.options.map((opt, i) => (
                                <Badge key={i} variant="outline">{opt}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeQuestion(q.id)}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Add Question Form */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-base">Add Question</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Text *</Label>
                    <Input
                      placeholder="Enter your question..."
                      value={newQuestion.text}
                      onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <Select value={newQuestion.type} onValueChange={(v: any) => setNewQuestion({ ...newQuestion, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="radio">Single Choice</SelectItem>
                          <SelectItem value="checkbox">Multiple Choice</SelectItem>
                          <SelectItem value="text">Text Input</SelectItem>
                          <SelectItem value="scale">Rating Scale (1-5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newQuestion.required}
                          onChange={(e) => setNewQuestion({ ...newQuestion, required: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm">Required</span>
                      </label>
                    </div>
                  </div>
                  {(newQuestion.type === 'radio' || newQuestion.type === 'checkbox') && (
                    <div className="space-y-2">
                      <Label>Options</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add option..."
                          value={optionInput}
                          onChange={(e) => setOptionInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                        />
                        <Button type="button" variant="outline" onClick={addOption}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newQuestion.options?.map((opt, i) => (
                          <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeOption(i)}>
                            {opt} <XCircleIcon className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button type="button" onClick={addQuestion} className="w-full">
                    <PlusIcon className="h-4 w-4 mr-2" />Add Question
                  </Button>
                </CardContent>
              </Card>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Spinner size="sm" className="mr-2" />}
                  Create Survey
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ClipboardListIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Surveys</p>
                <p className="text-2xl font-bold">{surveys.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Surveys</p>
                <p className="text-2xl font-bold">{activeSurveys}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <UsersIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Responses</p>
                <p className="text-2xl font-bold">{totalResponses.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <BarChart2Icon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Questions</p>
                <p className="text-2xl font-bold">
                  {surveys.length > 0 ? Math.round(surveys.reduce((sum, s) => sum + s.questions.length, 0) / surveys.length) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search surveys..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Surveys Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Survey Name</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSurveys.map((survey) => (
                  <TableRow key={survey.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{survey.surveyName}</p>
                        {survey.description && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">{survey.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{survey.questions.length}</TableCell>
                    <TableCell>{survey._count?.responses || 0}</TableCell>
                    <TableCell>
                      <Badge variant={survey.isActive ? 'default' : 'secondary'}>
                        {survey.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {survey.startDate && survey.endDate ? (
                        <span className="text-sm">
                          {new Date(survey.startDate).toLocaleDateString()} - {new Date(survey.endDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" title="View Responses">
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMutation.mutate({ id: survey.id, isActive: !survey.isActive })}
                        title={survey.isActive ? 'Stop Survey' : 'Start Survey'}
                      >
                        {survey.isActive ? <StopCircleIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this survey?')) {
                            deleteMutation.mutate(survey.id);
                          }
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSurveys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm
                        ? 'No surveys found matching your search.'
                        : 'No surveys yet. Create your first survey.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
