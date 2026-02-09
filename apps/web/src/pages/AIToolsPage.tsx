import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Spinner } from '../components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  SparklesIcon,
  CoinsIcon,
  FileTextIcon,
  UploadIcon,
  DownloadIcon,
  PlayIcon,
  HistoryIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  BrainIcon,
  ImageIcon,
  FileSpreadsheetIcon,
  Wand2Icon,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface AIFeature {
  id: string;
  name: string;
  featureKey: string;
  description?: string;
  category?: string;
  creditsPerUse: number;
  isActive: boolean;
}

interface UsageRecord {
  id: string;
  featureName: string;
  creditsUsed: number;
  status: string;
  createdAt: string;
  inputSummary?: string;
  outputSummary?: string;
}

export function AIToolsPage() {
  const [selectedFeature, setSelectedFeature] = useState<AIFeature | null>(null);
  const [activeTab, setActiveTab] = useState('features');

  // Fetch available AI features
  const { data: featuresResponse, isLoading: featuresLoading } = useQuery({
    queryKey: ['ai-features'],
    queryFn: () => aiAPI.getAvailableFeatures(),
  });

  // Fetch credits
  const { data: creditsResponse, isLoading: creditsLoading } = useQuery({
    queryKey: ['ai-credits'],
    queryFn: () => aiAPI.getCredits(),
  });

  // Fetch usage history
  const { data: usageResponse } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => aiAPI.getUsageHistory({ limit: 20 }),
  });

  const features = featuresResponse?.data?.data || [];
  const credits = creditsResponse?.data?.data;
  const usageHistory: UsageRecord[] = usageResponse?.data?.data || [];

  const isLoading = featuresLoading || creditsLoading;

  // Group features by category
  const featuresByCategory = features.reduce((acc: Record<string, AIFeature[]>, feature: AIFeature) => {
    const category = feature.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(feature);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Tools</h1>
          <p className="text-gray-500">Use AI-powered features to enhance your workflow</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg">
            <CoinsIcon className="h-5 w-5 text-orange-500" />
            <span className="font-medium text-orange-700">
              {credits?.balance?.toLocaleString() || 0} Credits
            </span>
          </div>
        </div>
      </div>

      {credits?.balance <= 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangleIcon className="h-5 w-5" />
            <span className="font-medium">No credits available</span>
          </div>
          <p className="text-sm text-red-600 mt-1">
            You don't have any AI credits. Contact your administrator to purchase credits.
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <SparklesIcon className="h-4 w-4" />
            AI Features
          </TabsTrigger>
          <TabsTrigger value="ocr" className="flex items-center gap-2">
            <FileTextIcon className="h-4 w-4" />
            PDF to Excel (OCR)
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            Usage History
          </TabsTrigger>
        </TabsList>

        {/* AI Features Tab */}
        <TabsContent value="features" className="space-y-6">
          {features.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BrainIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No AI features available</p>
                <p className="text-sm text-gray-400 mt-1">
                  Contact your administrator to enable AI features.
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-4">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(categoryFeatures as AIFeature[]).map((feature: AIFeature) => (
                    <Card
                      key={feature.id}
                      className={cn(
                        'cursor-pointer hover:border-orange-300 transition-colors',
                        selectedFeature?.id === feature.id && 'border-orange-500 ring-1 ring-orange-500'
                      )}
                      onClick={() => setSelectedFeature(feature)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{feature.name}</h4>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {feature.description || 'No description'}
                            </p>
                          </div>
                          <Wand2Icon className="h-5 w-5 text-orange-500 flex-shrink-0" />
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <Badge variant="outline" className="text-xs">
                            <CoinsIcon className="h-3 w-3 mr-1" />
                            {feature.creditsPerUse} credits
                          </Badge>
                          <Button
                            size="sm"
                            disabled={credits?.balance < feature.creditsPerUse}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFeature(feature);
                            }}
                          >
                            <PlayIcon className="h-4 w-4 mr-1" />
                            Use
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Feature Execution Modal */}
          {selectedFeature && (
            <FeatureExecutionModal
              feature={selectedFeature}
              credits={credits?.balance || 0}
              onClose={() => setSelectedFeature(null)}
            />
          )}
        </TabsContent>

        {/* OCR Tab */}
        <TabsContent value="ocr">
          <OCRTool credits={credits?.balance || 0} />
        </TabsContent>

        {/* Usage History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>Your recent AI feature usage</CardDescription>
            </CardHeader>
            <CardContent>
              {usageHistory.length === 0 ? (
                <div className="text-center py-8">
                  <HistoryIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No usage history yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Your AI feature usage will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {usageHistory.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'p-2 rounded-full',
                            record.status === 'SUCCESS'
                              ? 'bg-green-100'
                              : record.status === 'FAILED'
                                ? 'bg-red-100'
                                : 'bg-gray-100'
                          )}
                        >
                          {record.status === 'SUCCESS' ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          ) : record.status === 'FAILED' ? (
                            <XCircleIcon className="h-4 w-4 text-red-600" />
                          ) : (
                            <Spinner size="sm" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{record.featureName}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(record.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        <CoinsIcon className="h-3 w-3 mr-1" />
                        {record.creditsUsed} credits
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Feature Execution Modal
function FeatureExecutionModal({
  feature,
  credits,
  onClose,
}: {
  feature: AIFeature;
  credits: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);

  const executeMutation = useMutation({
    mutationFn: (inputData: any) => aiAPI.executeFeature(feature.featureKey, inputData),
    onSuccess: (response) => {
      setResult(response.data?.data);
      queryClient.invalidateQueries({ queryKey: ['ai-credits'] });
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] });
      toast.success('Feature executed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to execute feature');
    },
  });

  const handleExecute = () => {
    if (!input.trim()) {
      toast.error('Please enter input');
      return;
    }
    executeMutation.mutate({ text: input });
  };

  const insufficientCredits = credits < feature.creditsPerUse;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">{feature.name}</h2>
          <p className="text-gray-500 text-sm mt-1">{feature.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">
              <CoinsIcon className="h-3 w-3 mr-1" />
              {feature.creditsPerUse} credits per use
            </Badge>
            {insufficientCredits && (
              <Badge variant="destructive">Insufficient credits</Badge>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="font-medium">Result</span>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setResult(null)}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Input</Label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter your input here..."
                  className="w-full h-32 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleExecute}
                  disabled={insufficientCredits || executeMutation.isPending}
                >
                  {executeMutation.isPending ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Execute ({feature.creditsPerUse} credits)
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// OCR Tool Component
function OCRTool({ credits }: { credits: number }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState('excel');
  const [result, setResult] = useState<any>(null);
  const [_previewUrl, setPreviewUrl] = useState<string | null>(null);

  const ocrCredits = 5; // Default OCR credits per use

  const processMutation = useMutation({
    mutationFn: (data: { file: File; outputFormat: string }) =>
      aiAPI.processOCR({ file: data.file, outputFormat: data.outputFormat }),
    onSuccess: (response) => {
      setResult(response.data?.data);
      queryClient.invalidateQueries({ queryKey: ['ai-credits'] });
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] });
      toast.success('PDF processed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to process PDF');
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleProcess = () => {
    if (!selectedFile) {
      toast.error('Please select a PDF file');
      return;
    }
    processMutation.mutate({ file: selectedFile, outputFormat });
  };

  const handleDownload = () => {
    if (result?.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const insufficientCredits = credits < ocrCredits;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            PDF to Excel Converter
          </CardTitle>
          <CardDescription>
            Extract data from PDF documents and convert to Excel format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CoinsIcon className="h-4 w-4" />
            <span>{ocrCredits} credits per document</span>
            {insufficientCredits && (
              <Badge variant="destructive" className="ml-2">
                Insufficient credits
              </Badge>
            )}
          </div>

          {/* File Upload Area */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
              selectedFile ? 'border-orange-300 bg-orange-50' : 'border-gray-300 hover:border-orange-300'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="space-y-2">
                <FileTextIcon className="h-12 w-12 text-orange-500 mx-auto" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleReset(); }}>
                  Change File
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadIcon className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="font-medium">Drop PDF here or click to upload</p>
                <p className="text-sm text-gray-500">Maximum file size: 10MB</p>
              </div>
            )}
          </div>

          {/* Output Format Selection */}
          <div className="space-y-2">
            <Label>Output Format</Label>
            <Select value={outputFormat} onValueChange={setOutputFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheetIcon className="h-4 w-4 text-green-600" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="h-4 w-4 text-blue-600" />
                    CSV (.csv)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="h-4 w-4 text-purple-600" />
                    JSON (.json)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Process Button */}
          <Button
            className="w-full"
            onClick={handleProcess}
            disabled={!selectedFile || insufficientCredits || processMutation.isPending}
          >
            {processMutation.isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Wand2Icon className="h-4 w-4 mr-2" />
                Process PDF ({ocrCredits} credits)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheetIcon className="h-5 w-5" />
            Result
          </CardTitle>
          <CardDescription>Processed output will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="font-medium">Processing Complete</span>
                </div>
                <div className="text-sm space-y-2">
                  {result.rowsExtracted && (
                    <p>Rows extracted: {result.rowsExtracted}</p>
                  )}
                  {result.columnsExtracted && (
                    <p>Columns detected: {result.columnsExtracted}</p>
                  )}
                  {result.pagesProcessed && (
                    <p>Pages processed: {result.pagesProcessed}</p>
                  )}
                </div>
              </div>

              {result.preview && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <span className="text-sm font-medium">Data Preview</span>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <pre className="text-xs whitespace-pre-wrap">
                      {typeof result.preview === 'string'
                        ? result.preview
                        : JSON.stringify(result.preview, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {result.downloadUrl && (
                <Button className="w-full" onClick={handleDownload}>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download {outputFormat.toUpperCase()} File
                </Button>
              )}

              <Button variant="outline" className="w-full" onClick={handleReset}>
                Process Another File
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Upload a PDF to get started</p>
              <p className="text-sm text-gray-400 mt-1">
                The extracted data will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
