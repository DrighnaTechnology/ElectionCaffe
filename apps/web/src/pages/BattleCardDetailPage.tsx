import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { candidatesAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ArrowLeftIcon,
  CopyIcon,
  CheckIcon,
  SwordIcon,
  MicIcon,
  UsersIcon,
  MapPinIcon,
  ShareIcon,
  TargetIcon,
  TrophyIcon,
  MessageSquareIcon,
} from 'lucide-react';
import { useState, useCallback } from 'react';

// ========== Copy to clipboard hook ==========
function useCopyToClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return { copiedId, copy };
}

function CopyButton({ text, id }: { text: string; id: string }) {
  const { copiedId, copy } = useCopyToClipboard();
  const isCopied = copiedId === id;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); copy(text, id); }}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-muted hover:bg-muted text-muted-foreground transition-colors shrink-0"
      title="Copy to clipboard"
    >
      {isCopied ? <CheckIcon className="h-3 w-3 text-green-600" /> : <CopyIcon className="h-3 w-3" />}
      {isCopied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ========== Helper: safe array from JSON ==========
function safeArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  return [];
}
function safeObj(val: any): Record<string, any> {
  if (val && typeof val === 'object' && !Array.isArray(val)) return val;
  return {};
}

// ========== Strategy Tab ==========
function StrategyTab({ bc }: { bc: any }) {
  const strengths = safeArray(bc.ourStrengths);
  const weaknesses = safeArray(bc.opponentWeaknesses);
  const counters = safeArray(bc.counterArguments);
  const hth = safeObj(bc.headToHeadStats);

  return (
    <div className="space-y-6">
      {/* Head to Head Summary */}
      {hth.overallAdvantage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Head-to-Head Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={hth.overallAdvantage === 'Our Candidate' ? 'default' : 'secondary'} className="text-sm">
                {hth.overallAdvantage}
              </Badge>
              {hth.confidenceLevel && (
                <Badge variant="outline" className="text-sm">
                  Confidence: {hth.confidenceLevel}
                </Badge>
              )}
            </div>
            {hth.keyBattleground && <p className="text-sm text-muted-foreground"><span className="font-medium">Key Battleground:</span> {hth.keyBattleground}</p>}
            {hth.winStrategy && <p className="text-sm text-foreground">{hth.winStrategy}</p>}
            {safeArray(hth.criticalActions).length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2 text-brand">Critical Actions (Next 30 Days)</p>
                <ol className="space-y-1 list-decimal list-inside">
                  {safeArray(hth.criticalActions).map((a: string, i: number) => (
                    <li key={i} className="text-sm text-foreground">{a}</li>
                  ))}
                </ol>
              </div>
            )}
            {safeArray(hth.riskFactors).length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2 text-red-700">Risk Factors</p>
                <ul className="space-y-1">
                  {safeArray(hth.riskFactors).map((r: string, i: number) => (
                    <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                      <span className="mt-1 shrink-0 h-1.5 w-1.5 rounded-full bg-red-500" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Strengths */}
      <div>
        <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
          <TrophyIcon className="h-4 w-4" /> Our Strengths ({strengths.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {strengths.map((s: any, i: number) => {
            const title = typeof s === 'string' ? s : s.strength;
            const detail = typeof s === 'string' ? null : s.detail;
            const amplify = typeof s === 'string' ? null : s.howToAmplify;
            const target = typeof s === 'string' ? null : s.targetDemographic;
            return (
              <Card key={i} className="border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <p className="font-medium text-sm text-green-800">{title}</p>
                  {detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}
                  {amplify && <p className="text-xs text-green-700 mt-2"><span className="font-medium">Amplify:</span> {amplify}</p>}
                  {target && <Badge variant="outline" className="mt-2 text-xs">{target}</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Weaknesses */}
      <div>
        <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
          <TargetIcon className="h-4 w-4" /> Opponent Weaknesses ({weaknesses.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {weaknesses.map((w: any, i: number) => {
            const title = typeof w === 'string' ? w : w.weakness;
            const detail = typeof w === 'string' ? null : w.detail;
            const exploit = typeof w === 'string' ? null : w.howToExploit;
            const backfire = typeof w === 'string' ? null : w.riskOfBackfire;
            return (
              <Card key={i} className="border-red-200 bg-red-50/50">
                <CardContent className="p-4">
                  <p className="font-medium text-sm text-red-800">{title}</p>
                  {detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}
                  {exploit && <p className="text-xs text-red-700 mt-2"><span className="font-medium">Exploit:</span> {exploit}</p>}
                  {backfire && <p className="text-xs text-brand mt-1"><span className="font-medium">Backfire Risk:</span> {backfire}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Counter Arguments */}
      {counters.length > 0 && (
        <div>
          <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
            <SwordIcon className="h-4 w-4" /> Counter-Attack Playbook ({counters.length})
          </h3>
          <div className="space-y-3">
            {counters.map((c: any, i: number) => {
              const attack = typeof c === 'string' ? c : c.attack;
              const response = typeof c === 'string' ? null : c.response;
              const severity = typeof c === 'string' ? null : c.severity;
              const pivot = typeof c === 'string' ? null : c.pivotTo;
              return (
                <Card key={i} className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm text-red-700">Attack: {attack}</p>
                          {severity && (
                            <Badge variant={severity === 'HIGH' ? 'destructive' : 'outline'} className="text-xs">
                              {severity}
                            </Badge>
                          )}
                        </div>
                        {response && <p className="text-sm text-green-700 mt-1"><span className="font-medium">Response:</span> {response}</p>}
                        {pivot && <p className="text-xs text-blue-600 mt-1"><span className="font-medium">Then pivot to:</span> {pivot}</p>}
                      </div>
                      {response && <CopyButton text={response} id={`counter-${i}`} />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Ammunition Tab ==========
function AmmunitionTab({ bc }: { bc: any }) {
  const ammo = safeObj(bc.campaignAmmunition);
  const oneLiners = safeArray(ammo.wittyOneLiners);
  const nicknames = safeObj(ammo.nicknames);
  const slogans = safeArray(ammo.slogans);
  const whatsappForwards = safeArray(ammo.whatsappForwards);

  if (!oneLiners.length && !slogans.length && !whatsappForwards.length) {
    return <EmptySection message="Campaign ammunition will appear here after generating a new battle card with the enhanced prompts." />;
  }

  return (
    <div className="space-y-6">
      {/* Witty One-Liners */}
      {oneLiners.length > 0 && (
        <div>
          <h3 className="font-semibold text-brand mb-3">Witty One-Liners</h3>
          <div className="space-y-2">
            {oneLiners.map((ol: any, i: number) => {
              const line = typeof ol === 'string' ? ol : ol.line;
              const context = typeof ol === 'string' ? null : ol.context;
              const emotion = typeof ol === 'string' ? null : ol.targetEmotion;
              return (
                <Card key={i} className="border-brand/30 bg-brand-muted/30">
                  <CardContent className="p-3 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">"{line}"</p>
                      <div className="flex gap-2 mt-1">
                        {context && <span className="text-xs text-muted-foreground">Use: {context}</span>}
                        {emotion && <Badge variant="outline" className="text-xs">{emotion}</Badge>}
                      </div>
                    </div>
                    <CopyButton text={line} id={`liner-${i}`} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Opponent Nickname */}
      {nicknames.forOpponent && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Opponent Nickname</p>
            <p className="text-xl font-bold text-purple-700">"{nicknames.forOpponent}"</p>
            {nicknames.rationale && <p className="text-xs text-muted-foreground mt-1">{nicknames.rationale}</p>}
          </CardContent>
        </Card>
      )}

      {/* Slogans */}
      {slogans.length > 0 && (
        <div>
          <h3 className="font-semibold text-blue-700 mb-3">Campaign Slogans</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {slogans.map((s: string, i: number) => (
              <Card key={i} className="border-blue-200 bg-blue-50/30">
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-blue-800">{s}</p>
                  <CopyButton text={s} id={`slogan-${i}`} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp Forwards */}
      {whatsappForwards.length > 0 && (
        <div>
          <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
            <MessageSquareIcon className="h-4 w-4" /> WhatsApp Ready Messages
          </h3>
          <div className="space-y-2">
            {whatsappForwards.map((msg: string, i: number) => (
              <Card key={i} className="border-green-200 bg-green-50/30">
                <CardContent className="p-3 flex items-start justify-between gap-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap flex-1">{msg}</p>
                  <CopyButton text={msg} id={`wa-${i}`} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Speeches Tab ==========
function SpeechesTab({ bc }: { bc: any }) {
  const speeches = safeArray(bc.speechPoints);

  if (!speeches.length) {
    return <EmptySection message="Speech points will appear here after generating a new battle card with the enhanced prompts." />;
  }

  return (
    <div className="space-y-4">
      {speeches.map((sp: any, i: number) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{sp.topic || `Speech Point ${i + 1}`}</CardTitle>
                <CardDescription className="flex flex-wrap gap-2 mt-1">
                  {sp.audience && <Badge variant="outline" className="text-xs">{sp.audience}</Badge>}
                  {sp.duration && <Badge variant="secondary" className="text-xs">{sp.duration}</Badge>}
                </CardDescription>
              </div>
              {sp.content && <CopyButton text={sp.content} id={`speech-${i}`} />}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{sp.content}</p>
            {sp.crowdReaction && (
              <p className="text-xs text-brand mt-3 italic">Expected reaction: {sp.crowdReaction}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ========== Demographics Tab ==========
function DemographicsTab({ bc }: { bc: any }) {
  const voterAppeal = safeObj(bc.voterAppeal);
  const demoStrategy = safeObj(bc.demographicStrategy);
  const segments = ['youth', 'women', 'farmers', 'seniors', 'urban', 'firstTimeVoters', 'minorities'];

  return (
    <div className="space-y-6">
      {/* Voter Appeal Bars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Voter Appeal Comparison</CardTitle>
          <CardDescription>Estimated appeal score (0-100) per demographic segment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {segments.map((seg) => {
            const data = safeObj(voterAppeal[seg]);
            if (!data.ours && !data.theirs) return null;
            const label = seg.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase());
            return (
              <div key={seg}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">Ours: {data.ours || 0} | Theirs: {data.theirs || 0}</span>
                </div>
                <div className="flex gap-1 items-center">
                  <div className="flex-1">
                    <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-green-500 rounded-l-full"
                        style={{ width: `${data.ours || 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-center">vs</span>
                  <div className="flex-1">
                    <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-red-400 rounded-l-full"
                        style={{ width: `${data.theirs || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                {data.strategy && <p className="text-xs text-muted-foreground mt-1">{data.strategy}</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Demographic Strategy Cards */}
      {Object.keys(demoStrategy).length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Segment-wise Strategy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(demoStrategy).map(([key, val]: [string, any]) => {
              const data = safeObj(val);
              const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase());
              return (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{label}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    {data.message && <p className="text-foreground"><span className="font-medium">Message:</span> {data.message}</p>}
                    {safeArray(data.channels).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {safeArray(data.channels).map((ch: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{ch}</Badge>
                        ))}
                      </div>
                    )}
                    {data.influencers && <p className="text-muted-foreground"><span className="font-medium">Influencers:</span> {data.influencers}</p>}
                    {data.events && <p className="text-muted-foreground"><span className="font-medium">Events:</span> {data.events}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Ground Game Tab ==========
function GroundGameTab({ bc }: { bc: any }) {
  const gs = safeObj(bc.groundStrategy);
  const booth = safeObj(gs.boothManagement);
  const d2d = safeObj(gs.doorToDoor);
  const rally = safeObj(gs.rallyStrategy);
  const last48 = safeObj(gs.last48Hours);

  if (!Object.keys(gs).length) {
    return <EmptySection message="Ground strategy will appear here after generating a new battle card with the enhanced prompts." />;
  }

  return (
    <div className="space-y-6">
      {/* Booth Management */}
      {Object.keys(booth).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><MapPinIcon className="h-4 w-4" /> Booth Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {booth.strategy && <p><span className="font-medium">Strategy:</span> {booth.strategy}</p>}
            {booth.keyMetric && <p><span className="font-medium">Target:</span> {booth.keyMetric}</p>}
            {booth.boothAgentScript && (
              <div className="bg-muted/50 rounded-lg p-3 mt-2">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-medium text-xs text-muted-foreground">Booth Agent Script</p>
                  <CopyButton text={booth.boothAgentScript} id="booth-script" />
                </div>
                <p className="text-sm text-foreground">{booth.boothAgentScript}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Door-to-Door */}
      {Object.keys(d2d).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Door-to-Door Playbook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {d2d.openingLine && (
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-medium text-xs text-green-700">Opening Line</p>
                  <CopyButton text={d2d.openingLine} id="d2d-open" />
                </div>
                <p className="text-sm text-foreground">"{d2d.openingLine}"</p>
              </div>
            )}
            {d2d.comparison && (
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-medium text-xs text-blue-700">30-Second Comparison Pitch</p>
                  <CopyButton text={d2d.comparison} id="d2d-comp" />
                </div>
                <p className="text-sm text-foreground">{d2d.comparison}</p>
              </div>
            )}
            {d2d.closingAsk && (
              <div className="bg-brand-muted rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-medium text-xs text-brand">Closing Ask</p>
                  <CopyButton text={d2d.closingAsk} id="d2d-close" />
                </div>
                <p className="text-sm text-foreground">"{d2d.closingAsk}"</p>
              </div>
            )}
            {safeArray(d2d.objectionHandling).length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2">Objection Handling</p>
                <div className="space-y-2">
                  {safeArray(d2d.objectionHandling).map((oh: any, i: number) => (
                    <div key={i} className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-red-600">Objection: {oh.objection}</p>
                      <p className="text-sm text-foreground mt-1">{oh.response}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rally Strategy */}
      {Object.keys(rally).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rally Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {rally.format && <p><span className="font-medium">Format:</span> {rally.format}</p>}
            {rally.crowdSize && <p><span className="font-medium">Target Crowd:</span> {rally.crowdSize}</p>}
            {rally.keyMoment && <p><span className="font-medium">Viral Moment:</span> {rally.keyMoment}</p>}
            {rally.followUp && <p><span className="font-medium">Follow-Up:</span> {rally.followUp}</p>}
          </CardContent>
        </Card>
      )}

      {/* Last 48 Hours */}
      {Object.keys(last48).length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg text-red-700">Last 48 Hours Battle Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {safeArray(last48.priorities).length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2">Top Priorities</p>
                <ol className="list-decimal list-inside space-y-1">
                  {safeArray(last48.priorities).map((p: string, i: number) => (
                    <li key={i} className="text-sm text-foreground">{p}</li>
                  ))}
                </ol>
              </div>
            )}
            {last48.warRoomSetup && <p className="text-sm"><span className="font-medium">War Room:</span> {last48.warRoomSetup}</p>}
            {last48.voterTurnout && <p className="text-sm"><span className="font-medium">Turnout Strategy:</span> {last48.voterTurnout}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ========== Social Media Tab ==========
function SocialMediaTab({ bc }: { bc: any }) {
  const sm = safeObj(bc.socialMediaStrategy);
  const platforms = safeObj(sm.platforms);
  const calendar = safeArray(sm.contentCalendar);

  if (!Object.keys(sm).length) {
    return <EmptySection message="Social media strategy will appear here after generating a new battle card with the enhanced prompts." />;
  }

  return (
    <div className="space-y-6">
      {sm.overallNarrative && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="p-4">
            <p className="text-xs text-purple-600 font-medium mb-1">Overall Narrative</p>
            <p className="text-sm text-foreground">{sm.overallNarrative}</p>
          </CardContent>
        </Card>
      )}

      {/* Platform Cards */}
      {Object.keys(platforms).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(platforms).map(([platform, data]: [string, any]) => {
            const pd = safeObj(data);
            const colors: Record<string, string> = {
              whatsapp: 'border-green-300 bg-green-50/30',
              instagram: 'border-pink-300 bg-pink-50/30',
              twitter: 'border-blue-300 bg-blue-50/30',
              youtube: 'border-red-300 bg-red-50/30',
              facebook: 'border-indigo-300 bg-indigo-50/30',
            };
            return (
              <Card key={platform} className={colors[platform] || ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize">{platform === 'twitter' ? 'Twitter / X' : platform}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  {pd.strategy && <p><span className="font-medium">Strategy:</span> {pd.strategy}</p>}
                  {pd.contentType && <p><span className="font-medium">Content:</span> {pd.contentType}</p>}
                  {pd.frequency && <p><span className="font-medium">Frequency:</span> {pd.frequency}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 7-Day Content Calendar */}
      {calendar.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">7-Day Content Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border p-2 text-left font-medium">Day</th>
                    <th className="border p-2 text-left font-medium">Theme</th>
                    <th className="border p-2 text-left font-medium">WhatsApp</th>
                    <th className="border p-2 text-left font-medium">Instagram</th>
                    <th className="border p-2 text-left font-medium">Twitter</th>
                  </tr>
                </thead>
                <tbody>
                  {calendar.map((row: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/50'}>
                      <td className="border p-2 font-medium whitespace-nowrap">{row.day}</td>
                      <td className="border p-2">{row.theme}</td>
                      <td className="border p-2">{row.whatsapp}</td>
                      <td className="border p-2">{row.instagram}</td>
                      <td className="border p-2">{row.twitter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ========== Key Issues Tab ==========
function KeyIssuesTab({ bc }: { bc: any }) {
  const issues = safeArray(bc.keyIssues);
  const talkingPoints = safeArray(bc.talkingPoints);

  return (
    <div className="space-y-6">
      {/* Issues Matrix */}
      {issues.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Issue Matrix</h3>
          {issues.map((issue: any, i: number) => {
            const name = typeof issue === 'string' ? issue : issue.issue;
            const importance = typeof issue === 'string' ? null : issue.importance;
            const ourPos = typeof issue === 'string' ? null : issue.ourPosition;
            const theirPos = typeof issue === 'string' ? null : issue.theirPosition;
            const advantage = typeof issue === 'string' ? null : issue.ourAdvantage;
            const talkPt = typeof issue === 'string' ? null : issue.talkingPoint;
            const hashtag = typeof issue === 'string' ? null : issue.hashtag;

            return (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{name}</p>
                      {importance && (
                        <Badge
                          variant={importance === 'HIGH' ? 'destructive' : importance === 'MEDIUM' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {importance}
                        </Badge>
                      )}
                    </div>
                    {advantage !== null && (
                      <Badge variant={advantage ? 'default' : 'destructive'} className="text-xs">
                        {advantage ? 'Our Advantage' : 'Their Advantage'}
                      </Badge>
                    )}
                  </div>
                  {(ourPos || theirPos) && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {ourPos && (
                        <div className="bg-green-50 rounded p-2">
                          <p className="text-xs font-medium text-green-700 mb-1">Our Position</p>
                          <p className="text-xs text-foreground">{ourPos}</p>
                        </div>
                      )}
                      {theirPos && (
                        <div className="bg-red-50 rounded p-2">
                          <p className="text-xs font-medium text-red-700 mb-1">Their Position</p>
                          <p className="text-xs text-foreground">{theirPos}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {talkPt && (
                    <div className="flex items-start justify-between gap-2 mt-2 bg-muted/50 rounded p-2">
                      <p className="text-xs text-foreground"><span className="font-medium">Doorstep pitch:</span> {talkPt}</p>
                      <CopyButton text={talkPt} id={`issue-tp-${i}`} />
                    </div>
                  )}
                  {hashtag && <Badge variant="outline" className="mt-2 text-xs">{hashtag}</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Talking Points */}
      {talkingPoints.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Door-to-Door Talking Points</h3>
          <div className="space-y-2">
            {talkingPoints.map((tp: string, i: number) => (
              <Card key={i} className="border-border">
                <CardContent className="p-3 flex items-start justify-between gap-3">
                  <p className="text-sm text-foreground flex-1">{tp}</p>
                  <CopyButton text={tp} id={`tp-${i}`} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Win Path Tab ==========
function WinPathTab({ bc }: { bc: any }) {
  const wp = safeObj(bc.winPath);
  const path = safeArray(wp.path);
  const mustWin = safeArray(wp.mustWinSegments);
  const electionDay = safeObj(wp.electionDayPlan);

  if (!Object.keys(wp).length) {
    return <EmptySection message="Win path strategy will appear here after generating a new battle card with the enhanced prompts." />;
  }

  return (
    <div className="space-y-6">
      {/* Current Position */}
      <Card className="border-brand/30">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {wp.currentPosition && (
              <div>
                <p className="text-xs text-muted-foreground">Current Position</p>
                <p className="text-lg font-bold text-brand">{wp.currentPosition}</p>
              </div>
            )}
            {wp.voteShareTarget && (
              <div>
                <p className="text-xs text-muted-foreground">Vote Share Target</p>
                <p className="text-lg font-bold text-blue-700">{wp.voteShareTarget}</p>
              </div>
            )}
          </div>
          {wp.swingVoterProfile && (
            <div className="mt-3 bg-yellow-50 rounded p-3">
              <p className="text-xs font-medium text-yellow-700 mb-1">Swing Voter Profile</p>
              <p className="text-sm text-foreground">{wp.swingVoterProfile}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step-by-Step Path */}
      {path.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Path to Victory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-brand/30" />
              <div className="space-y-4">
                {path.map((step: any, i: number) => (
                  <div key={i} className="relative pl-10">
                    <div className="absolute left-2.5 top-1 h-3 w-3 rounded-full bg-brand border-2 border-white" />
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">Step {step.step || i + 1}</Badge>
                        {step.timeline && <span className="text-xs text-muted-foreground">{step.timeline}</span>}
                      </div>
                      <p className="text-sm font-medium text-foreground">{step.action}</p>
                      {step.impact && <p className="text-xs text-green-600 mt-1">Impact: {step.impact}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Must-Win Segments */}
      {mustWin.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-700">Must-Win Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {mustWin.map((seg: string, i: number) => (
                <Badge key={i} variant="destructive" className="text-sm">{seg}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Election Day Plan */}
      {Object.keys(electionDay).length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">Election Day Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {electionDay.morningStrategy && (
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-xs font-medium text-yellow-700 mb-1">Morning (6 AM - 12 PM)</p>
                <p className="text-sm text-foreground">{electionDay.morningStrategy}</p>
              </div>
            )}
            {electionDay.afternoonStrategy && (
              <div className="bg-brand-muted rounded-lg p-3">
                <p className="text-xs font-medium text-brand mb-1">Afternoon (12 PM - 4 PM) - Critical Hours</p>
                <p className="text-sm text-foreground">{electionDay.afternoonStrategy}</p>
              </div>
            )}
            {electionDay.eveningPush && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs font-medium text-red-700 mb-1">Evening Push (4 PM - 6 PM)</p>
                <p className="text-sm text-foreground">{electionDay.eveningPush}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ========== Empty section placeholder ==========
function EmptySection({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

// ========== Main Page ==========
export function BattleCardDetailPage() {
  const { candidateId, bcId } = useParams<{ candidateId: string; bcId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['battle-card-detail', candidateId, bcId],
    queryFn: () => candidatesAPI.getBattleCardById(candidateId!, bcId!),
    enabled: !!candidateId && !!bcId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data?.data?.data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load battle card.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const bc = data.data.data;
  const candidate = bc.candidate || {};
  const opponent = bc.opponent || {};

  return (
    <div className="space-y-6">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-bold">{bc.title}</h1>
          <p className="text-sm text-muted-foreground">
            Generated {bc.createdAt ? new Date(bc.createdAt).toLocaleDateString() : ''}
          </p>
        </div>
      </div>

      {/* Candidate vs Opponent Header */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            {/* Our Candidate */}
            <div className="flex items-center gap-3">
              {candidate.photoUrl ? (
                <img src={candidate.photoUrl} alt={candidate.name} className="h-16 w-16 rounded-full object-cover border-2 border-green-500" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl border-2 border-green-500">
                  {candidate.name?.[0] || '?'}
                </div>
              )}
              <div>
                <p className="font-bold text-green-700">{candidate.name || 'Our Candidate'}</p>
                <p className="text-xs text-muted-foreground">{candidate.party?.partyName || 'Independent'}</p>
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                  {candidate.age && <span>Age: {candidate.age}</span>}
                  {candidate.education && <span>{candidate.education}</span>}
                </div>
              </div>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center">
              <Badge variant="outline" className="text-lg font-bold px-3 py-1">VS</Badge>
            </div>

            {/* Opponent */}
            <div className="flex items-center gap-3 justify-end text-right">
              <div>
                <p className="font-bold text-red-700">{opponent.name || 'Opponent'}</p>
                <p className="text-xs text-muted-foreground">{opponent.party?.partyName || 'Independent'}</p>
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground justify-end">
                  {opponent.age && <span>Age: {opponent.age}</span>}
                  {opponent.education && <span>{opponent.education}</span>}
                </div>
              </div>
              {opponent.photoUrl ? (
                <img src={opponent.photoUrl} alt={opponent.name} className="h-16 w-16 rounded-full object-cover border-2 border-red-500" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xl border-2 border-red-500">
                  {opponent.name?.[0] || '?'}
                </div>
              )}
            </div>
          </div>

          {/* Executive Summary */}
          {bc.summary && (
            <div className="mt-4 bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-foreground">{bc.summary}</p>
            </div>
          )}

          {/* Quick badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            {bc.headToHeadStats?.overallAdvantage && (
              <Badge variant={bc.headToHeadStats.overallAdvantage === 'Our Candidate' ? 'default' : 'secondary'}>
                {bc.headToHeadStats.overallAdvantage}
              </Badge>
            )}
            {bc.headToHeadStats?.confidenceLevel && (
              <Badge variant="outline">Confidence: {bc.headToHeadStats.confidenceLevel}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 8 Tabs */}
      <Tabs defaultValue="strategy">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="strategy" className="text-xs gap-1"><SwordIcon className="h-3 w-3" /> Strategy</TabsTrigger>
          <TabsTrigger value="ammunition" className="text-xs gap-1"><TargetIcon className="h-3 w-3" /> Ammunition</TabsTrigger>
          <TabsTrigger value="speeches" className="text-xs gap-1"><MicIcon className="h-3 w-3" /> Speeches</TabsTrigger>
          <TabsTrigger value="demographics" className="text-xs gap-1"><UsersIcon className="h-3 w-3" /> Demographics</TabsTrigger>
          <TabsTrigger value="ground" className="text-xs gap-1"><MapPinIcon className="h-3 w-3" /> Ground Game</TabsTrigger>
          <TabsTrigger value="social" className="text-xs gap-1"><ShareIcon className="h-3 w-3" /> Social Media</TabsTrigger>
          <TabsTrigger value="issues" className="text-xs gap-1"><MessageSquareIcon className="h-3 w-3" /> Key Issues</TabsTrigger>
          <TabsTrigger value="winpath" className="text-xs gap-1"><TrophyIcon className="h-3 w-3" /> Win Path</TabsTrigger>
        </TabsList>

        <TabsContent value="strategy"><StrategyTab bc={bc} /></TabsContent>
        <TabsContent value="ammunition"><AmmunitionTab bc={bc} /></TabsContent>
        <TabsContent value="speeches"><SpeechesTab bc={bc} /></TabsContent>
        <TabsContent value="demographics"><DemographicsTab bc={bc} /></TabsContent>
        <TabsContent value="ground"><GroundGameTab bc={bc} /></TabsContent>
        <TabsContent value="social"><SocialMediaTab bc={bc} /></TabsContent>
        <TabsContent value="issues"><KeyIssuesTab bc={bc} /></TabsContent>
        <TabsContent value="winpath"><WinPathTab bc={bc} /></TabsContent>
      </Tabs>
    </div>
  );
}
