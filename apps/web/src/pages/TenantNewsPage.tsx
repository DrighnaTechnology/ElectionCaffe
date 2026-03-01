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
  NewspaperIcon,
  SearchIcon,
  ExternalLinkIcon,
  CalendarIcon,
  TagIcon,
  GlobeIcon,
  MapPinIcon,
  LoaderIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const NEWS_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'ELECTION', label: 'Election' },
  { value: 'POLITICAL', label: 'Political' },
  { value: 'POLICY', label: 'Policy' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'LOCAL', label: 'Local' },
  { value: 'NATIONAL', label: 'National' },
  { value: 'ECONOMIC', label: 'Economic' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'DEVELOPMENT', label: 'Development' },
  { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
  { value: 'HEALTH', label: 'Health' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'CONTROVERSY', label: 'Controversy' },
];

const NEWS_SCOPES = [
  { value: 'all', label: 'All Scopes' },
  { value: 'NATIONAL', label: 'National' },
  { value: 'STATE', label: 'State' },
  { value: 'DISTRICT', label: 'District' },
  { value: 'CONSTITUENCY', label: 'Constituency' },
];

export function TenantNewsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [scope, setScope] = useState('all');

  const { data: newsData, isLoading } = useQuery({
    queryKey: ['tenant-news', { search, category, scope }],
    queryFn: () => newsAPI.getAll({
      search: search || undefined,
      category: category !== 'all' ? category : undefined,
      geographicLevel: scope !== 'all' ? scope : undefined,
      limit: 50,
    }),
  });

  const { data: categoryStats } = useQuery({
    queryKey: ['news-category-stats'],
    queryFn: () => newsAPI.getCategoryStats(),
  });

  // Fetch news from Google News RSS — passes active filters to get targeted results
  const fetchNewsMutation = useMutation({
    mutationFn: () => newsAPI.fetchNews({
      category: category !== 'all' ? category : undefined,
      scope: scope !== 'all' ? scope : undefined,
    }),
    onSuccess: (data) => {
      const result = data.data?.data;
      toast.success(`Fetched ${result?.created || 0} new articles (${result?.skipped || 0} duplicates skipped)`);
      queryClient.invalidateQueries({ queryKey: ['tenant-news'] });
      queryClient.invalidateQueries({ queryKey: ['news-category-stats'] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error?.message || 'Failed to fetch news';
      toast.error(msg);
    },
  });

  const news = newsData?.data?.data?.data || newsData?.data?.data || [];
  const stats = categoryStats?.data?.data?.categories || categoryStats?.data?.data || [];

  const getCategoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      ELECTION: 'bg-purple-100 text-purple-800',
      POLITICAL: 'bg-blue-100 text-blue-800',
      POLICY: 'bg-green-100 text-green-800',
      GOVERNMENT: 'bg-brand-muted text-brand',
      LOCAL: 'bg-yellow-100 text-yellow-800',
      NATIONAL: 'bg-red-100 text-red-800',
      ECONOMIC: 'bg-cyan-100 text-cyan-800',
      SOCIAL: 'bg-pink-100 text-pink-800',
      DEVELOPMENT: 'bg-emerald-100 text-emerald-800',
      INFRASTRUCTURE: 'bg-orange-100 text-orange-800',
      HEALTH: 'bg-rose-100 text-rose-800',
      EDUCATION: 'bg-indigo-100 text-indigo-800',
      CONTROVERSY: 'bg-red-100 text-red-800',
    };
    return colors[cat] || 'bg-muted text-foreground';
  };

  const getScopeBadge = (newsScope: string) => {
    const colors: Record<string, string> = {
      NATIONAL: 'bg-red-100 text-red-800',
      STATE: 'bg-brand-muted text-brand',
      DISTRICT: 'bg-yellow-100 text-yellow-800',
      CONSTITUENCY: 'bg-green-100 text-green-800',
    };
    return colors[newsScope] || 'bg-muted text-foreground';
  };


  return (
    <div className="space-y-6">
      {/* Header with Fetch Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">News & Information</h1>
          <p className="text-muted-foreground">
            Stay updated with constituency election news and political information
          </p>
        </div>
        <Button
          onClick={() => fetchNewsMutation.mutate()}
          disabled={fetchNewsMutation.isPending}
        >
          {fetchNewsMutation.isPending ? (
            <>
              <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Fetch News
            </>
          )}
        </Button>
      </div>

      {/* Category Stats */}
      {Array.isArray(stats) && stats.length > 0 && (
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
                  {item.category && (
                    <Badge className={getCategoryBadge(item.category)}>
                      <TagIcon className="h-3 w-3 mr-1" />
                      {item.category}
                    </Badge>
                  )}
                  {item.geographicLevel && (
                    <Badge className={getScopeBadge(item.geographicLevel)}>
                      {item.geographicLevel === 'NATIONAL' ? <GlobeIcon className="h-3 w-3 mr-1" /> : <MapPinIcon className="h-3 w-3 mr-1" />}
                      {item.geographicLevel}
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
                  {item.sourceName && (
                    <span className="truncate max-w-[120px]">{item.sourceName}</span>
                  )}
                </div>
                {item.sourceUrl && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(item.sourceUrl, '_blank')}
                    >
                      <ExternalLinkIcon className="h-4 w-4 mr-1" />
                      Read Source
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <NewspaperIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No news found</h3>
            <p className="text-muted-foreground mb-4">
              {search || category !== 'all' || scope !== 'all'
                ? 'Try adjusting your filters'
                : 'No news articles yet. Click below to fetch the latest constituency news.'}
            </p>
            {!search && category === 'all' && scope === 'all' && (
              <Button
                onClick={() => fetchNewsMutation.mutate()}
                disabled={fetchNewsMutation.isPending}
                size="lg"
              >
                {fetchNewsMutation.isPending ? (
                  <>
                    <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                    Fetching News...
                  </>
                ) : (
                  <>
                    <NewspaperIcon className="h-4 w-4 mr-2" />
                    Fetch Latest News
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
