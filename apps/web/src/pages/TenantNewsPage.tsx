import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  NewspaperIcon,
  SearchIcon,
  ExternalLinkIcon,
  BrainCircuitIcon,
  CalendarIcon,
  TagIcon,
  GlobeIcon,
  MapPinIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  LoaderIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const NEWS_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'ELECTION', label: 'Election' },
  { value: 'POLITICAL', label: 'Political' },
  { value: 'POLICY', label: 'Policy' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'LOCAL', label: 'Local' },
  { value: 'NATIONAL', label: 'National' },
  { value: 'ECONOMIC', label: 'Economic' },
  { value: 'SOCIAL', label: 'Social' },
];

const NEWS_SCOPES = [
  { value: '', label: 'All Scopes' },
  { value: 'NATIONAL', label: 'National' },
  { value: 'STATE', label: 'State' },
  { value: 'DISTRICT', label: 'District' },
  { value: 'CONSTITUENCY', label: 'Constituency' },
];

export function TenantNewsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [scope, setScope] = useState('');
  const [selectedNews, setSelectedNews] = useState<any>(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  const { data: newsData, isLoading } = useQuery({
    queryKey: ['tenant-news', { search, category, scope }],
    queryFn: () => newsAPI.getAll({ search, category: category || undefined, scope: scope || undefined, limit: 50 }),
  });

  const { data: categoryStats } = useQuery({
    queryKey: ['news-category-stats'],
    queryFn: () => newsAPI.getCategoryStats(),
  });

  const analysisMutation = useMutation({
    mutationFn: (newsId: string) => newsAPI.requestAnalysis(newsId),
    onSuccess: (data) => {
      toast.success('AI analysis generated');
      setSelectedNews((prev: any) => ({ ...prev, analysis: data.data?.data }));
      queryClient.invalidateQueries({ queryKey: ['tenant-news'] });
    },
    onError: () => {
      toast.error('Failed to generate analysis');
    },
  });

  const news = newsData?.data?.data || [];
  const stats = categoryStats?.data?.data || [];

  const getCategoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      ELECTION: 'bg-purple-100 text-purple-800',
      POLITICAL: 'bg-blue-100 text-blue-800',
      POLICY: 'bg-green-100 text-green-800',
      GOVERNMENT: 'bg-orange-100 text-orange-800',
      LOCAL: 'bg-yellow-100 text-yellow-800',
      NATIONAL: 'bg-red-100 text-red-800',
      ECONOMIC: 'bg-cyan-100 text-cyan-800',
      SOCIAL: 'bg-pink-100 text-pink-800',
    };
    return colors[cat] || 'bg-gray-100 text-gray-800';
  };

  const getScopeBadge = (newsScope: string) => {
    const colors: Record<string, string> = {
      NATIONAL: 'bg-red-100 text-red-800',
      STATE: 'bg-orange-100 text-orange-800',
      DISTRICT: 'bg-yellow-100 text-yellow-800',
      CONSTITUENCY: 'bg-green-100 text-green-800',
    };
    return colors[newsScope] || 'bg-gray-100 text-gray-800';
  };

  const handleViewNews = async (item: any) => {
    setSelectedNews(item);
    setShowAnalysisDialog(true);
    // Fetch analysis if not already present
    if (!item.analysis) {
      try {
        const response = await newsAPI.getAnalysis(item.id);
        setSelectedNews((prev: any) => ({ ...prev, analysis: response.data?.data }));
      } catch {
        // Analysis not yet generated
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">News & Information</h1>
          <p className="text-muted-foreground">
            Stay updated with election news and political information relevant to your constituency
          </p>
        </div>
      </div>

      {/* Category Stats */}
      {stats.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
          {stats.slice(0, 6).map((stat: any) => (
            <Card key={stat.category} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setCategory(stat.category)}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <Badge className={getCategoryBadge(stat.category)}>{stat.category}</Badge>
                  <span className="text-lg font-bold">{stat.count}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search news..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {NEWS_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                {NEWS_SCOPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* News List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-20 w-full mb-4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : news.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {news.map((item: any) => (
            <Card key={item.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">{item.title}</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className={getCategoryBadge(item.category)}>
                    <TagIcon className="h-3 w-3 mr-1" />
                    {item.category}
                  </Badge>
                  {item.scope && (
                    <Badge className={getScopeBadge(item.scope)}>
                      {item.scope === 'NATIONAL' ? <GlobeIcon className="h-3 w-3 mr-1" /> : <MapPinIcon className="h-3 w-3 mr-1" />}
                      {item.scope}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                  {item.summary || item.content?.substring(0, 200)}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {item.publishedAt ? format(new Date(item.publishedAt), 'PP') : 'N/A'}
                  </div>
                  {item.source && (
                    <span className="truncate max-w-[120px]">{item.source}</span>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewNews(item)}
                  >
                    <BrainCircuitIcon className="h-4 w-4 mr-1" />
                    AI Analysis
                  </Button>
                  {item.sourceUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(item.sourceUrl, '_blank')}
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <NewspaperIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No news found</h3>
            <p className="text-muted-foreground">
              {search || category || scope
                ? 'Try adjusting your filters'
                : 'News articles will appear here once synced'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Dialog */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedNews?.title}</DialogTitle>
            <DialogDescription>
              AI-powered analysis and insights
            </DialogDescription>
          </DialogHeader>
          {selectedNews && (
            <div className="space-y-4">
              {/* News Details */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge className={getCategoryBadge(selectedNews.category)}>
                    {selectedNews.category}
                  </Badge>
                  {selectedNews.scope && (
                    <Badge className={getScopeBadge(selectedNews.scope)}>
                      {selectedNews.scope}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{selectedNews.summary || selectedNews.content}</p>
                {selectedNews.publishedAt && (
                  <p className="text-xs text-muted-foreground">
                    Published: {format(new Date(selectedNews.publishedAt), 'PPP')}
                  </p>
                )}
              </div>

              {/* AI Analysis Section */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BrainCircuitIcon className="h-5 w-5 text-purple-600" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedNews.analysis ? (
                    <div className="space-y-4">
                      {selectedNews.analysis.sentiment && (
                        <div className="flex items-center gap-2">
                          <TrendingUpIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">Sentiment:</span>
                          <Badge variant={selectedNews.analysis.sentiment === 'POSITIVE' ? 'default' : selectedNews.analysis.sentiment === 'NEGATIVE' ? 'destructive' : 'secondary'}>
                            {selectedNews.analysis.sentiment}
                          </Badge>
                        </div>
                      )}
                      {selectedNews.analysis.impact && (
                        <div className="flex items-center gap-2">
                          <AlertCircleIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">Impact Level:</span>
                          <Badge>{selectedNews.analysis.impact}</Badge>
                        </div>
                      )}
                      {selectedNews.analysis.summary && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Summary</h4>
                          <p className="text-sm text-muted-foreground">{selectedNews.analysis.summary}</p>
                        </div>
                      )}
                      {selectedNews.analysis.keyPoints && selectedNews.analysis.keyPoints.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Key Points</h4>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {selectedNews.analysis.keyPoints.map((point: string, i: number) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedNews.analysis.recommendations && selectedNews.analysis.recommendations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Recommendations</h4>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {selectedNews.analysis.recommendations.map((rec: string, i: number) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        No analysis available yet for this news article.
                      </p>
                      <Button
                        onClick={() => analysisMutation.mutate(selectedNews.id)}
                        disabled={analysisMutation.isPending}
                      >
                        {analysisMutation.isPending ? (
                          <>
                            <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <BrainCircuitIcon className="h-4 w-4 mr-2" />
                            Generate AI Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
