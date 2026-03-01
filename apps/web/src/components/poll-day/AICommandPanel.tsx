import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Spinner } from '../ui/spinner';
import { VictoryCalculator } from './VictoryCalculator';
import {
  BrainIcon, SwordsIcon, ZapIcon, ShieldAlertIcon,
  ChevronDownIcon, ChevronUpIcon, SparklesIcon,
  TargetIcon, AlertTriangleIcon,
} from 'lucide-react';

interface AICommandPanelProps {
  electionId: string;
  warRoomData: any;
  victory: any;
  incidents: any;
  gotv: any;
}

export function AICommandPanel({ electionId, warRoomData, victory, incidents, gotv }: AICommandPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('situation');

  // AI Situation Report
  const situationMutation = useMutation({
    mutationFn: () => api.post(`/ai-analytics/${electionId}/poll-day/situation-report`),
  });

  // AI Battle Orders
  const battleOrdersMutation = useMutation({
    mutationFn: () => api.post(`/ai-analytics/${electionId}/poll-day/battle-orders`),
  });

  // Fetch existing battle orders
  const { data: existingOrders } = useQuery({
    queryKey: ['battle-orders', electionId],
    queryFn: () => api.get(`/poll-day/war-room/${electionId}`, { params: { includeOrders: true } }),
    enabled: !!electionId,
  });

  const situationReport = situationMutation.data?.data?.data;
  const battleOrders = battleOrdersMutation.data?.data?.data?.orders || [];

  const toggle = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="h-full overflow-y-auto space-y-2 p-3">
      {/* SITUATION REPORT */}
      <Card className="border-brand/20">
        <CardHeader
          className="py-2 px-3 cursor-pointer flex flex-row items-center justify-between"
          onClick={() => toggle('situation')}
        >
          <div className="flex items-center gap-2">
            <BrainIcon className="h-4 w-4 text-brand" />
            <CardTitle className="text-sm">AI Situation Report</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                situationMutation.mutate();
              }}
              disabled={situationMutation.isPending}
            >
              {situationMutation.isPending ? <Spinner className="h-3 w-3" /> : <SparklesIcon className="h-3 w-3 mr-1" />}
              Generate
            </Button>
            {expandedSection === 'situation' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </div>
        </CardHeader>
        {expandedSection === 'situation' && (
          <CardContent className="px-3 pb-3 pt-0">
            {situationReport ? (
              <div className="space-y-2 text-xs">
                {/* Overall status */}
                <div className={`p-2 rounded-md ${
                  situationReport.overallStatus === 'GREEN' ? 'bg-green-50 border border-green-200' :
                  situationReport.overallStatus === 'YELLOW' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <p className="font-medium">{situationReport.summary}</p>
                </div>

                {/* Critical issues */}
                {situationReport.criticalIssues?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-destructive flex items-center gap-1 mb-1">
                      <AlertTriangleIcon className="h-3 w-3" /> Critical Issues
                    </h4>
                    <ul className="space-y-1">
                      {situationReport.criticalIssues.map((issue: string, i: number) => (
                        <li key={i} className="text-destructive/80 pl-3 border-l-2 border-destructive/30">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action items */}
                {situationReport.actionItems?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-brand flex items-center gap-1 mb-1">
                      <ZapIcon className="h-3 w-3" /> Action Items
                    </h4>
                    <ul className="space-y-1">
                      {situationReport.actionItems.map((item: string, i: number) => (
                        <li key={i} className="pl-3 border-l-2 border-brand/30">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Booths needing attention */}
                {situationReport.boothsNeedingAttention?.length > 0 && (
                  <div>
                    <h4 className="font-semibold flex items-center gap-1 mb-1">
                      <TargetIcon className="h-3 w-3" /> Focus Booths
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {situationReport.boothsNeedingAttention.map((booth: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{booth}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground mt-1">
                  Generated at {new Date(situationReport.generatedAt).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Click "Generate" to get an AI-powered situation assessment
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* BATTLE ORDERS */}
      <Card className="border-orange-500/20">
        <CardHeader
          className="py-2 px-3 cursor-pointer flex flex-row items-center justify-between"
          onClick={() => toggle('orders')}
        >
          <div className="flex items-center gap-2">
            <SwordsIcon className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-sm">Battle Orders</CardTitle>
            {battleOrders.length > 0 && (
              <Badge className="text-[10px] bg-orange-500">{battleOrders.length}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                battleOrdersMutation.mutate();
              }}
              disabled={battleOrdersMutation.isPending}
            >
              {battleOrdersMutation.isPending ? <Spinner className="h-3 w-3" /> : <ZapIcon className="h-3 w-3 mr-1" />}
              Generate Orders
            </Button>
            {expandedSection === 'orders' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </div>
        </CardHeader>
        {expandedSection === 'orders' && (
          <CardContent className="px-3 pb-3 pt-0">
            {battleOrders.length > 0 ? (
              <div className="space-y-2">
                {battleOrders.map((order: any, i: number) => (
                  <div
                    key={i}
                    className={`p-2 rounded-md border text-xs ${
                      order.priority === 'CRITICAL' ? 'border-red-300 bg-red-50' :
                      order.priority === 'HIGH' ? 'border-orange-300 bg-orange-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{order.title}</span>
                      <Badge variant="outline" className="text-[10px]">{order.priority}</Badge>
                    </div>
                    <p className="text-muted-foreground">{order.description}</p>
                    {order.targetBoothId && (
                      <span className="text-[10px] text-brand">Target: Booth {order.targetBoothId}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Click "Generate Orders" for AI-powered tactical commands
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* VICTORY CALCULATOR */}
      <Card className="border-purple-500/20">
        <CardHeader
          className="py-2 px-3 cursor-pointer flex flex-row items-center justify-between"
          onClick={() => toggle('victory')}
        >
          <div className="flex items-center gap-2">
            <TargetIcon className="h-4 w-4 text-purple-500" />
            <CardTitle className="text-sm">Victory Calculator</CardTitle>
          </div>
          {expandedSection === 'victory' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
        </CardHeader>
        {expandedSection === 'victory' && (
          <CardContent className="px-3 pb-3 pt-0">
            <VictoryCalculator data={victory} electionId={electionId} />
          </CardContent>
        )}
      </Card>

      {/* QUICK STATS */}
      <Card>
        <CardHeader className="py-2 px-3">
          <div className="flex items-center gap-2">
            <ShieldAlertIcon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Quick Intel</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0 space-y-2 text-xs">
          {/* Gender turnout */}
          {warRoomData?.overall && (
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-1.5 rounded bg-blue-50">
                <div className="font-bold text-blue-600">{warRoomData.overall.maleVoted || 0}</div>
                <div className="text-[10px] text-blue-500">Male</div>
              </div>
              <div className="text-center p-1.5 rounded bg-pink-50">
                <div className="font-bold text-pink-600">{warRoomData.overall.femaleVoted || 0}</div>
                <div className="text-[10px] text-pink-500">Female</div>
              </div>
              <div className="text-center p-1.5 rounded bg-purple-50">
                <div className="font-bold text-purple-600">{warRoomData.overall.otherVoted || 0}</div>
                <div className="text-[10px] text-purple-500">Other</div>
              </div>
            </div>
          )}

          {/* GOTV summary */}
          {gotv && (
            <div className="p-2 rounded bg-muted">
              <div className="font-semibold mb-1">GOTV Progress</div>
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                <div>Wave 1: {gotv.byWave?.[1] || 0} targets</div>
                <div>Wave 2: {gotv.byWave?.[2] || 0} targets</div>
                <div>Wave 3: {gotv.byWave?.[3] || 0} targets</div>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                Total: {gotv.totalTargets || 0} | Voted: {gotv.byStatus?.VOTED || 0} | Contacted: {gotv.byStatus?.CONTACTED || 0}
              </div>
            </div>
          )}

          {/* Incident summary */}
          {incidents && Array.isArray(incidents) && incidents.length > 0 && (
            <div className="p-2 rounded bg-red-50">
              <div className="font-semibold text-red-700 mb-1">
                {incidents.filter((i: any) => i.status === 'OPEN' || i.status === 'ESCALATED').length} Open Incidents
              </div>
              <div className="text-[10px] text-red-600">
                {incidents.filter((i: any) => i.severity === 'CRITICAL').length} Critical,{' '}
                {incidents.filter((i: any) => i.severity === 'HIGH').length} High
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
