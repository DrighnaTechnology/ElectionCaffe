import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { surveysAPI, caffeAIAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Spinner } from '../components/ui/spinner';
import { toast } from 'sonner';
import { buildSurveyReportHTML } from '../utils/survey-report-html';
import { getTenantSlug } from '../utils/tenant';
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
  PencilIcon,
  SparklesIcon,
  DownloadIcon,
  ArrowLeftIcon,
  LayoutTemplateIcon,
  Share2Icon,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'text' | 'radio' | 'checkbox' | 'scale' | 'yes_no' | 'ranking' | 'multiple_select' | 'multiple_choice' | 'rating';
  question?: string; // alternate field name from seed data
  questionLocal?: string;
  options?: string[];
  min?: number;
  max?: number;
  required: boolean;
}

interface Survey {
  id: string;
  surveyName: string;
  title?: string;
  description?: string;
  questions: SurveyQuestion[];
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  totalResponses?: number;
  _count?: { responses: number };
}

const QUESTION_TYPES = [
  { value: 'radio', label: 'Single Choice' },
  { value: 'checkbox', label: 'Multiple Choice' },
  { value: 'multiple_select', label: 'Multi-Select' },
  { value: 'text', label: 'Text Input' },
  { value: 'scale', label: 'Rating Scale (1-5)' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'ranking', label: 'Ranking' },
];

const needsOptions = (type: string) =>
  ['radio', 'checkbox', 'multiple_select', 'multiple_choice', 'ranking'].includes(type);

// ── Survey Templates ─────────────────────────────────────────────────────────

const SURVEY_TEMPLATES = [
  {
    name: 'Voter Sentiment',
    description: 'Party preference, government rating, key issues',
    icon: '🗳️',
    questions: [
      { id: 'q1', type: 'radio', text: 'Which party do you intend to vote for?', options: ['BJP', 'Congress', 'AAP', 'Regional Party', 'Others', 'Undecided'], required: true },
      { id: 'q2', type: 'scale', text: 'How would you rate the current government performance? (1-5)', required: true },
      { id: 'q3', type: 'radio', text: 'What is the most important issue for you?', options: ['Employment', 'Healthcare', 'Education', 'Infrastructure', 'Agriculture', 'Law & Order', 'Corruption'], required: true },
      { id: 'q4', type: 'yes_no', text: 'Are you satisfied with local development work?', required: true },
      { id: 'q5', type: 'text', text: 'Any suggestions for improvement?', required: false },
    ],
  },
  {
    name: 'Booth Mood Assessment',
    description: 'Quick booth-level WIN/CLOSE/LOSE classification',
    icon: '📊',
    questions: [
      { id: 'q1', type: 'radio', text: 'What is the general mood in this booth area?', options: ['Strongly in our favor', 'Slightly in our favor', 'Neutral/Mixed', 'Slightly against', 'Strongly against'], required: true },
      { id: 'q2', type: 'scale', text: 'Rate anti-incumbency sentiment (1=none, 5=very high)', required: true },
      { id: 'q3', type: 'radio', text: 'Which local leader has the most influence here?', options: ['Our candidate', 'Opposition candidate', 'Local MLA/MP', 'Community leader', 'None'], required: true },
      { id: 'q4', type: 'text', text: 'Key local issue in this booth area?', required: true },
    ],
  },
  {
    name: 'Issue Priorities',
    description: 'Development priorities and scheme awareness',
    icon: '🏗️',
    questions: [
      { id: 'q1', type: 'ranking', text: 'Rank development areas by priority', options: ['Roads', 'Water Supply', 'Electricity', 'Schools', 'Hospitals', 'Public Transport'], required: true },
      { id: 'q2', type: 'radio', text: 'How satisfied are you with road conditions?', options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'], required: true },
      { id: 'q3', type: 'scale', text: 'Rate quality of public healthcare services (1-5)', required: true },
      { id: 'q4', type: 'multiple_select', text: 'Which facilities are needed in your area?', options: ['Park', 'Community Hall', 'Library', 'Sports Ground', 'Bus Stop', 'Street Lights'], required: true },
    ],
  },
  {
    name: 'Candidate Awareness',
    description: 'Name recognition and information sources',
    icon: '👤',
    questions: [
      { id: 'q1', type: 'yes_no', text: 'Do you know who is contesting from your constituency?', required: true },
      { id: 'q2', type: 'radio', text: 'How did you hear about the candidates?', options: ['TV/News', 'Social Media', 'Newspaper', 'Door-to-door', 'Public meetings', 'Word of mouth'], required: true },
      { id: 'q3', type: 'scale', text: 'Rate your confidence in the leading candidate (1-5)', required: true },
      { id: 'q4', type: 'text', text: 'What qualities do you look for in a candidate?', required: false },
    ],
  },
  {
    name: 'Opposition Intelligence',
    description: 'Competitor strengths and voter perception',
    icon: '🔍',
    questions: [
      { id: 'q1', type: 'radio', text: "What is the opposition candidate's strongest point?", options: ['Good track record', 'Strong community backing', 'Financial resources', 'Party brand', 'Youth appeal', "Don't know"], required: true },
      { id: 'q2', type: 'yes_no', text: 'Have you heard any negative news about our candidate?', required: true },
      { id: 'q3', type: 'text', text: 'What is the opposition offering that attracts voters?', required: true },
      { id: 'q4', type: 'radio', text: 'Who do you think will win?', options: ['Our candidate (strongly)', 'Our candidate (slightly)', 'Too close to call', 'Opposition (slightly)', 'Opposition (strongly)'], required: true },
    ],
  },
  {
    name: 'Youth & Employment',
    description: 'Jobs, skills, and scheme effectiveness',
    icon: '💼',
    questions: [
      { id: 'q1', type: 'radio', text: 'What is your current employment status?', options: ['Employed Full-time', 'Employed Part-time', 'Self-employed', 'Unemployed', 'Student', 'Homemaker'], required: true },
      { id: 'q2', type: 'radio', text: 'What type of employment do you prefer?', options: ['Government Job', 'Private Sector', 'Self-employment', 'Freelancing', 'Agriculture'], required: true },
      { id: 'q3', type: 'multiple_select', text: 'What skills training would benefit you?', options: ['Computer Skills', 'Communication', 'Technical Training', 'Entrepreneurship', 'Language Skills', 'Vocational Training'], required: true },
      { id: 'q4', type: 'scale', text: 'Rate government employment schemes effectiveness (1-5)', required: true },
    ],
  },
  {
    name: 'Women Safety & Welfare',
    description: 'Safety perception and welfare scheme awareness',
    icon: '🛡️',
    questions: [
      { id: 'q1', type: 'scale', text: 'How safe do you feel in your neighborhood? (1-5)', required: true },
      { id: 'q2', type: 'radio', text: 'Are you aware of women welfare schemes?', options: ['Yes, all schemes', 'Yes, some schemes', "Heard but don't know details", 'Not aware'], required: true },
      { id: 'q3', type: 'multiple_select', text: 'Which welfare schemes have you benefited from?', options: ['Free Bus Travel', 'Education Scholarship', 'Health Insurance', 'Self-help Groups', 'None'], required: true },
      { id: 'q4', type: 'yes_no', text: 'Is there a police station nearby for emergencies?', required: true },
    ],
  },
  {
    name: 'Post-Contact Report',
    description: "Cadre's assessment after visiting a voter",
    icon: '📝',
    questions: [
      { id: 'q1', type: 'radio', text: 'How was the voter response?', options: ['Very Positive', 'Positive', 'Neutral', 'Negative', 'Hostile/Refused'], required: true },
      { id: 'q2', type: 'yes_no', text: 'Did they accept the pamphlet/material?', required: true },
      { id: 'q3', type: 'text', text: 'Key concern mentioned by the voter?', required: true },
      { id: 'q4', type: 'radio', text: 'Will they vote for us? (your assessment)', options: ['Definitely yes', 'Probably yes', 'Undecided', 'Probably no', 'Definitely no'], required: true },
    ],
  },
];

// ── Helper: get question text ────────────────────────────────────────────────

function getQText(q: SurveyQuestion): string {
  return q.text || q.question || '';
}

function getResponseCount(s: Survey): number {
  return s._count?.responses ?? s.totalResponses ?? 0;
}

// ── Helper: export responses to CSV ──────────────────────────────────────────

function exportResponsesCSV(survey: Survey, responses: any[]) {
  if (!responses.length) return;
  const questions = survey.questions || [];
  const headers = ['#', 'Submitted At', ...questions.map((q, i) => `Q${i + 1}: ${getQText(q)}`), 'Respondent Name', 'Respondent Age', 'Respondent Gender'];
  const rows = responses.map((r: any, idx: number) => {
    const answers = r.answers || {};
    const info = r.respondentInfo || {};
    return [
      idx + 1,
      r.submittedAt ? new Date(r.submittedAt).toLocaleString('en-IN') : '',
      ...questions.map((q) => {
        const a = answers[q.id];
        if (Array.isArray(a)) return a.join('; ');
        return a ?? '';
      }),
      info.name || '',
      info.age || '',
      info.gender || '',
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `survey-${survey.surveyName || 'export'}-responses.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ────────────────────────────────────────────────────────────────

export function SurveyPage() {
  const { selectedElectionId } = useElectionStore();
  const queryClient = useQueryClient();

  // ── State ──
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [viewingSurvey, setViewingSurvey] = useState<Survey | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
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

  // ── Queries ──
  const { data: surveysData, isLoading } = useQuery({
    queryKey: ['surveys', selectedElectionId],
    queryFn: () => surveysAPI.getAll(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: responseData, isLoading: responsesLoading } = useQuery({
    queryKey: ['survey-responses', viewingSurvey?.id],
    queryFn: () => surveysAPI.getResponses(viewingSurvey!.id, { limit: 500 }),
    enabled: !!viewingSurvey?.id,
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: any) => surveysAPI.create(selectedElectionId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys', selectedElectionId] });
      toast.success('Survey created successfully');
      closeDialog();
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to create survey'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => surveysAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys', selectedElectionId] });
      toast.success('Survey updated successfully');
      closeDialog();
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to update survey'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      surveysAPI.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys', selectedElectionId] });
      toast.success('Survey status updated');
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to update survey'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => surveysAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys', selectedElectionId] });
      toast.success('Survey deleted successfully');
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to delete survey'),
  });

  const aiGenerateMutation = useMutation({
    mutationFn: (prompt: string) => caffeAIAPI.generateSurvey(selectedElectionId!, prompt),
    onSuccess: (response) => {
      const data = response.data?.data;
      if (data) {
        if (data.title) setFormData(prev => ({ ...prev, surveyName: data.title }));
        if (data.description) setFormData(prev => ({ ...prev, description: data.description }));
        if (data.questions?.length) {
          const qs = data.questions.map((q: any) => ({
            id: q.id || crypto.randomUUID(),
            text: q.text || q.question || '',
            type: q.type || 'radio',
            options: q.options || [],
            required: q.required ?? true,
          }));
          setFormData(prev => ({ ...prev, questions: qs }));
        }
        toast.success('AI generated survey questions — review and save');
        setAiPrompt('');
      }
    },
    onError: () => toast.error('Failed to generate survey with AI'),
  });

  const aiAnalyzeMutation = useMutation({
    mutationFn: (surveyId: string) => caffeAIAPI.analyzeSurvey(surveyId, selectedElectionId!),
    onSuccess: (response) => {
      const data = response.data?.data;
      if (data) {
        // Build and open survey analysis report HTML in new tab
        const html = buildSurveyReportHTML(data);
        const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) win.addEventListener('load', () => URL.revokeObjectURL(url));
        else setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success('AI analysis opened in new tab');
      }
    },
    onError: () => toast.error('Failed to analyze survey'),
  });

  // ── Helpers ──
  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingSurveyId(null);
    setShowTemplates(false);
    setAiPrompt('');
    resetForm();
  };

  const resetForm = () => {
    setFormData({ surveyName: '', description: '', startDate: '', endDate: '', questions: [] });
    setNewQuestion({ text: '', type: 'radio', options: [], required: true });
    setOptionInput('');
  };

  const openEditDialog = (survey: Survey) => {
    setEditingSurveyId(survey.id);
    setFormData({
      surveyName: survey.surveyName || survey.title || '',
      description: survey.description || '',
      startDate: survey.startDate ? new Date(survey.startDate).toISOString().split('T')[0] : '',
      endDate: survey.endDate ? new Date(survey.endDate).toISOString().split('T')[0] : '',
      questions: (survey.questions || []).map((q: any) => ({
        id: q.id || crypto.randomUUID(),
        text: q.text || q.question || '',
        type: q.type || 'radio',
        options: q.options || [],
        required: q.required ?? true,
      })),
    });
    setIsDialogOpen(true);
  };

  const useTemplate = (template: typeof SURVEY_TEMPLATES[0]) => {
    setFormData({
      surveyName: template.name,
      description: template.description,
      startDate: '',
      endDate: '',
      questions: template.questions.map(q => ({ ...q, id: crypto.randomUUID() })) as SurveyQuestion[],
    });
    setShowTemplates(false);
  };

  const addQuestion = () => {
    if (!newQuestion.text) { toast.error('Enter question text'); return; }
    if (needsOptions(newQuestion.type || 'radio') && (!newQuestion.options || newQuestion.options.length < 2)) {
      toast.error('Add at least 2 options'); return;
    }
    const q: SurveyQuestion = {
      id: crypto.randomUUID(),
      text: newQuestion.text!,
      type: newQuestion.type as any,
      options: newQuestion.options,
      required: newQuestion.required ?? true,
    };
    setFormData({ ...formData, questions: [...formData.questions, q] });
    setNewQuestion({ text: '', type: 'radio', options: [], required: true });
    setOptionInput('');
  };

  const removeQuestion = (id: string) => {
    setFormData({ ...formData, questions: formData.questions.filter(q => q.id !== id) });
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setNewQuestion({ ...newQuestion, options: [...(newQuestion.options || []), optionInput.trim()] });
    setOptionInput('');
  };

  const removeOption = (index: number) => {
    setNewQuestion({ ...newQuestion, options: newQuestion.options?.filter((_, i) => i !== index) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.questions.length === 0) { toast.error('Add at least one question'); return; }
    if (editingSurveyId) {
      updateMutation.mutate({ id: editingSurveyId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // ── Data ──
  const surveys: Survey[] = surveysData?.data?.data || [];
  const filteredSurveys = surveys.filter(s =>
    (s.surveyName || s.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const activeSurveys = surveys.filter(s => s.isActive).length;
  const totalResponses = surveys.reduce((sum, s) => sum + getResponseCount(s), 0);
  const responses: any[] = responseData?.data?.data || [];

  // ── No election ──
  if (!selectedElectionId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircleIcon className="h-12 w-12 text-brand mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Election Selected</h2>
          <p className="text-muted-foreground">Please select an election from the sidebar to manage surveys.</p>
        </CardContent>
      </Card>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // VIEW RESPONSES MODE
  // ══════════════════════════════════════════════════════════════════════════════
  if (viewingSurvey) {
    const questions = viewingSurvey.questions || [];

    // Aggregate responses per question
    const aggregations = questions.map((q) => {
      const qid = q.id;
      const qText = getQText(q);
      const type = q.type;
      const counts: Record<string, number> = {};
      let total = 0;
      let sum = 0;
      const textAnswers: string[] = [];

      responses.forEach((r: any) => {
        const a = r.answers?.[qid];
        if (a === undefined || a === null || a === '') return;
        total++;

        if (type === 'text') {
          textAnswers.push(String(a));
        } else if (type === 'scale' || type === 'rating') {
          const n = Number(a);
          sum += n;
          const key = String(n);
          counts[key] = (counts[key] || 0) + 1;
        } else if (type === 'yes_no') {
          const key = String(a);
          counts[key] = (counts[key] || 0) + 1;
        } else if (type === 'multiple_select' || type === 'checkbox') {
          const arr = Array.isArray(a) ? a : [a];
          arr.forEach((v: string) => { counts[v] = (counts[v] || 0) + 1; });
        } else if (type === 'ranking') {
          // For ranking, count first-place votes
          const arr = Array.isArray(a) ? a : [];
          if (arr[0]) counts[arr[0]] = (counts[arr[0]] || 0) + 1;
        } else {
          // radio, multiple_choice
          const key = String(a);
          counts[key] = (counts[key] || 0) + 1;
        }
      });

      return { qid, qText, type, counts, total, sum, textAnswers, avg: total > 0 ? sum / total : 0 };
    });

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setViewingSurvey(null)}>
            <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{viewingSurvey.surveyName || viewingSurvey.title}</h1>
            <p className="text-sm text-muted-foreground">{responses.length} responses</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => exportResponsesCSV(viewingSurvey, responses)}>
            <DownloadIcon className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          {getResponseCount(viewingSurvey) >= 10 && (
            <Button
              size="sm"
              onClick={() => aiAnalyzeMutation.mutate(viewingSurvey.id)}
              disabled={aiAnalyzeMutation.isPending}
              style={{ background: 'hsl(var(--brand-primary))', color: 'hsl(var(--brand-primary-foreground))' }}
            >
              {aiAnalyzeMutation.isPending ? <Spinner size="sm" className="mr-1" /> : <SparklesIcon className="h-4 w-4 mr-1" />}
              Analyze with AI
            </Button>
          )}
        </div>

        {responsesLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : responses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <UsersIcon className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No responses yet</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Question-by-question breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aggregations.map((agg, idx) => (
                <Card key={agg.qid}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Q{idx + 1}. {agg.qText}</CardTitle>
                    <CardDescription className="text-xs">{agg.total} responses &middot; {agg.type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {agg.type === 'text' ? (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {agg.textAnswers.slice(0, 20).map((t, i) => (
                          <p key={i} className="text-sm text-muted-foreground border-l-2 border-muted pl-2">{t}</p>
                        ))}
                        {agg.textAnswers.length > 20 && (
                          <p className="text-xs text-muted-foreground">+ {agg.textAnswers.length - 20} more...</p>
                        )}
                      </div>
                    ) : agg.type === 'scale' || agg.type === 'rating' ? (
                      <div>
                        <div className="text-2xl font-bold mb-2">{agg.avg.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5 avg</span></div>
                        <div className="space-y-1">
                          {Object.entries(agg.counts).sort(([a], [b]) => Number(a) - Number(b)).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2 text-sm">
                              <span className="w-6 text-right font-medium">{k}</span>
                              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${agg.total > 0 ? (v / agg.total) * 100 : 0}%`, background: 'hsl(var(--brand-primary))' }}
                                />
                              </div>
                              <span className="w-16 text-xs text-muted-foreground">{v} ({agg.total > 0 ? ((v / agg.total) * 100).toFixed(0) : 0}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* radio, checkbox, yes_no, multiple_select, ranking, multiple_choice */
                      <div className="space-y-1">
                        {Object.entries(agg.counts).sort(([, a], [, b]) => b - a).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-2 text-sm">
                            <span className="w-28 truncate font-medium" title={k}>{k}</span>
                            <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${agg.total > 0 ? (v / agg.total) * 100 : 0}%`,
                                  background: agg.type === 'yes_no'
                                    ? (k === 'Yes' ? '#10b981' : '#ef4444')
                                    : 'hsl(var(--brand-primary))',
                                }}
                              />
                            </div>
                            <span className="w-16 text-xs text-muted-foreground">{v} ({agg.total > 0 ? ((v / agg.total) * 100).toFixed(0) : 0}%)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Individual responses table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Individual Responses ({responses.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Submitted</TableHead>
                        {questions.slice(0, 4).map((q, i) => (
                          <TableHead key={q.id} className="max-w-[200px]">Q{i + 1}</TableHead>
                        ))}
                        <TableHead>Respondent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responses.slice(0, 50).map((r: any, idx: number) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">{idx + 1}</TableCell>
                          <TableCell className="text-xs">{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('en-IN') : '-'}</TableCell>
                          {questions.slice(0, 4).map((q) => {
                            const a = r.answers?.[q.id];
                            const display = Array.isArray(a) ? a.join(', ') : String(a ?? '-');
                            return <TableCell key={q.id} className="text-xs max-w-[200px] truncate" title={display}>{display}</TableCell>;
                          })}
                          <TableCell className="text-xs">{r.respondentInfo?.name || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {responses.length > 50 && (
                  <p className="text-xs text-muted-foreground p-3 text-center">Showing first 50 of {responses.length} responses. Export CSV for all.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MAIN SURVEY LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Survey Manager</h1>
          <p className="text-muted-foreground">Create and manage voter surveys</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button><PlusIcon className="h-4 w-4 mr-2" />Create Survey</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSurveyId ? 'Edit Survey' : 'Create New Survey'}</DialogTitle>
              <DialogDescription>
                {editingSurveyId ? 'Update your survey details and questions' : 'Design your survey with questions for voters'}
              </DialogDescription>
            </DialogHeader>

            {/* AI Generate + Templates bar */}
            {!editingSurveyId && (
              <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Describe your survey... e.g. 'voter sentiment about water issues'"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && aiPrompt.trim() && aiGenerateMutation.mutate(aiPrompt)}
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => aiPrompt.trim() && aiGenerateMutation.mutate(aiPrompt)}
                    disabled={aiGenerateMutation.isPending || !aiPrompt.trim()}
                    style={{ background: 'hsl(var(--brand-primary))', color: 'hsl(var(--brand-primary-foreground))' }}
                  >
                    {aiGenerateMutation.isPending ? <Spinner size="sm" className="mr-1" /> : <SparklesIcon className="h-4 w-4 mr-1" />}
                    AI Generate
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplates(!showTemplates)}
                >
                  <LayoutTemplateIcon className="h-4 w-4 mr-1" />
                  Templates
                </Button>
              </div>
            )}

            {/* Templates picker */}
            {showTemplates && (
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {SURVEY_TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => useTemplate(t)}
                    className="text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{t.icon}</span>
                      <span className="font-medium text-sm">{t.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.questions.length} questions</p>
                  </button>
                ))}
              </div>
            )}

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
                    <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Questions ({formData.questions.length})</Label>
                {formData.questions.map((q, idx) => (
                  <Card key={q.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Q{idx + 1}. {getQText(q)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type} &middot; {q.required ? 'Required' : 'Optional'}
                          </p>
                          {q.options && q.options.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {q.options.map((opt, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{opt}</Badge>
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
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Add Question</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Text *</Label>
                    <Input placeholder="Enter your question..." value={newQuestion.text} onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <Select value={newQuestion.type} onValueChange={(v: any) => setNewQuestion({ ...newQuestion, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {QUESTION_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={newQuestion.required} onChange={(e) => setNewQuestion({ ...newQuestion, required: e.target.checked })} className="rounded" />
                        <span className="text-sm">Required</span>
                      </label>
                    </div>
                  </div>
                  {needsOptions(newQuestion.type || 'radio') && (
                    <div className="space-y-2">
                      <Label>Options</Label>
                      <div className="flex gap-2">
                        <Input placeholder="Add option..." value={optionInput} onChange={(e) => setOptionInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())} />
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
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Spinner size="sm" className="mr-2" />}
                  {editingSurveyId ? 'Update Survey' : 'Create Survey'}
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
              <div className="p-3 bg-blue-100 rounded-lg"><ClipboardListIcon className="h-6 w-6 text-blue-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Surveys</p>
                <p className="text-2xl font-bold">{surveys.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg"><CheckCircleIcon className="h-6 w-6 text-green-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Active Surveys</p>
                <p className="text-2xl font-bold">{activeSurveys}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg"><UsersIcon className="h-6 w-6 text-purple-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Responses</p>
                <p className="text-2xl font-bold">{totalResponses.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-muted rounded-lg"><BarChart2Icon className="h-6 w-6 text-brand" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Questions</p>
                <p className="text-2xl font-bold">
                  {surveys.length > 0 ? Math.round(surveys.reduce((sum, s) => sum + (s.questions?.length || 0), 0) / surveys.length) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search surveys..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                        <p className="font-medium">{survey.surveyName || survey.title}</p>
                        {survey.description && <p className="text-sm text-muted-foreground truncate max-w-xs">{survey.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{survey.questions?.length || 0}</TableCell>
                    <TableCell>{getResponseCount(survey).toLocaleString()}</TableCell>
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
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" title="View Responses" onClick={() => setViewingSurvey(survey)}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Copy Share Link" onClick={() => {
                        const slug = getTenantSlug();
                        if (!slug) { toast.error('Tenant not detected'); return; }
                        const url = `${window.location.origin}/s/${slug}/${survey.id}`;
                        navigator.clipboard.writeText(url).then(() => toast.success('Survey link copied!')).catch(() => toast.error('Failed to copy'));
                      }}>
                        <Share2Icon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Edit Survey" onClick={() => openEditDialog(survey)}>
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate({ id: survey.id, isActive: !survey.isActive })} title={survey.isActive ? 'Stop Survey' : 'Start Survey'}>
                        {survey.isActive ? <StopCircleIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { if (confirm('Delete this survey and all its responses?')) deleteMutation.mutate(survey.id); }}>
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSurveys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No surveys found matching your search.' : 'No surveys yet. Create your first survey.'}
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
