import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';

interface SurveyQuestion {
  id: string;
  text: string;
  question?: string;
  type: string;
  options?: string[];
  required: boolean;
  min?: number;
  max?: number;
}

interface SurveyData {
  id: string;
  title: string;
  titleLocal?: string;
  description?: string;
  questions: SurveyQuestion[];
}

export function PublicSurveyPage() {
  const { tenantSlug, surveyId } = useParams<{ tenantSlug: string; surveyId: string }>();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [respondentInfo, setRespondentInfo] = useState({ name: '', mobile: '', area: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenantSlug || !surveyId) return;
    setLoading(true);
    api.get(`/public/surveys/${tenantSlug}/${surveyId}`)
      .then(res => {
        setSurvey(res.data.data);
        setError('');
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Survey not found or no longer available');
      })
      .finally(() => setLoading(false));
  }, [tenantSlug, surveyId]);

  const setAnswer = (qId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const toggleCheckbox = (qId: string, option: string) => {
    setAnswers(prev => {
      const current: string[] = prev[qId] || [];
      return {
        ...prev,
        [qId]: current.includes(option)
          ? current.filter((o: string) => o !== option)
          : [...current, option],
      };
    });
  };

  const handleSubmit = async () => {
    if (!survey || !tenantSlug || !surveyId) return;

    // Validate required questions
    const missing = survey.questions.filter(q => {
      if (!q.required) return false;
      const a = answers[q.id];
      if (a === undefined || a === null || a === '') return true;
      if (Array.isArray(a) && a.length === 0) return true;
      return false;
    });

    if (missing.length > 0) {
      setError(`Please answer all required questions (${missing.length} remaining)`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post(`/public/surveys/${tenantSlug}/${surveyId}/respond`, {
        answers,
        respondentInfo: respondentInfo.name ? respondentInfo : undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.loadingDots}>
            <div style={styles.dot} />
            <div style={styles.dot} />
            <div style={styles.dot} />
          </div>
          <p style={{ textAlign: 'center', color: '#64748b', marginTop: '1rem' }}>Loading survey...</p>
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error && !survey) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😔</div>
            <h2 style={{ color: '#ef4444', marginBottom: '.5rem' }}>Survey Unavailable</h2>
            <p style={{ color: '#64748b' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Submitted State ──
  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ color: '#10b981', marginBottom: '.5rem' }}>Thank You!</h2>
            <p style={{ color: '#64748b' }}>Your response has been recorded successfully.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!survey) return null;

  const questions = survey.questions || [];

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>{survey.title}</h1>
        {survey.titleLocal && <p style={styles.headerLocal}>{survey.titleLocal}</p>}
        {survey.description && <p style={styles.headerDesc}>{survey.description}</p>}
        <p style={styles.headerMeta}>{questions.length} questions &middot; Takes ~{Math.max(2, questions.length)} min</p>
      </div>

      {/* Respondent Info (Optional) */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Your Information (Optional)</h3>
        <div style={styles.inputGrid}>
          <input
            style={styles.input}
            placeholder="Name / नाम"
            value={respondentInfo.name}
            onChange={e => setRespondentInfo(prev => ({ ...prev, name: e.target.value }))}
          />
          <input
            style={styles.input}
            placeholder="Mobile / मोबाइल"
            value={respondentInfo.mobile}
            onChange={e => setRespondentInfo(prev => ({ ...prev, mobile: e.target.value }))}
          />
          <input
            style={styles.input}
            placeholder="Area / क्षेत्र"
            value={respondentInfo.area}
            onChange={e => setRespondentInfo(prev => ({ ...prev, area: e.target.value }))}
          />
        </div>
      </div>

      {/* Questions */}
      {questions.map((q, idx) => {
        const qText = q.text || q.question || '';
        const qId = q.id;
        const qType = q.type;
        const options = q.options || [];

        return (
          <div key={qId} style={styles.card}>
            <div style={styles.qHeader}>
              <span style={styles.qNum}>{idx + 1}</span>
              <div>
                <p style={styles.qText}>{qText}</p>
                {q.required && <span style={styles.reqBadge}>Required</span>}
              </div>
            </div>

            <div style={styles.qBody}>
              {/* Radio */}
              {(qType === 'radio' || qType === 'multiple_choice') && options.map(opt => (
                <label key={opt} style={{
                  ...styles.option,
                  ...(answers[qId] === opt ? styles.optionSelected : {}),
                }}>
                  <input
                    type="radio"
                    name={qId}
                    checked={answers[qId] === opt}
                    onChange={() => setAnswer(qId, opt)}
                    style={{ marginRight: '.5rem' }}
                  />
                  {opt}
                </label>
              ))}

              {/* Checkbox / Multiple Select */}
              {(qType === 'checkbox' || qType === 'multiple_select') && options.map(opt => (
                <label key={opt} style={{
                  ...styles.option,
                  ...((answers[qId] || []).includes(opt) ? styles.optionSelected : {}),
                }}>
                  <input
                    type="checkbox"
                    checked={(answers[qId] || []).includes(opt)}
                    onChange={() => toggleCheckbox(qId, opt)}
                    style={{ marginRight: '.5rem' }}
                  />
                  {opt}
                </label>
              ))}

              {/* Yes/No */}
              {qType === 'yes_no' && (
                <div style={{ display: 'flex', gap: '.75rem' }}>
                  {['Yes', 'No'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswer(qId, opt)}
                      style={{
                        ...styles.ynBtn,
                        ...(answers[qId] === opt
                          ? opt === 'Yes' ? styles.ynYes : styles.ynNo
                          : {}),
                      }}
                    >
                      {opt === 'Yes' ? '👍' : '👎'} {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Scale */}
              {(qType === 'scale' || qType === 'rating') && (
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAnswer(qId, n)}
                      style={{
                        ...styles.scaleBtn,
                        ...(answers[qId] === n ? styles.scaleBtnActive : {}),
                      }}
                    >
                      {n} {'★'.repeat(n)}
                    </button>
                  ))}
                </div>
              )}

              {/* Text */}
              {qType === 'text' && (
                <textarea
                  style={styles.textarea}
                  placeholder="Type your answer here..."
                  rows={3}
                  value={answers[qId] || ''}
                  onChange={e => setAnswer(qId, e.target.value)}
                />
              )}

              {/* Ranking */}
              {qType === 'ranking' && (
                <div>
                  <p style={{ fontSize: '.75rem', color: '#94a3b8', marginBottom: '.5rem' }}>
                    Click options in order of priority (1st = highest)
                  </p>
                  {options.map(opt => {
                    const ranked: string[] = answers[qId] || [];
                    const pos = ranked.indexOf(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const current: string[] = answers[qId] || [];
                          if (current.includes(opt)) {
                            setAnswer(qId, current.filter((o: string) => o !== opt));
                          } else {
                            setAnswer(qId, [...current, opt]);
                          }
                        }}
                        style={{
                          ...styles.option,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '.5rem',
                          cursor: 'pointer',
                          ...(pos >= 0 ? styles.optionSelected : {}),
                        }}
                      >
                        {pos >= 0 && (
                          <span style={styles.rankNum}>{pos + 1}</span>
                        )}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Error message */}
      {error && (
        <div style={styles.errorBar}>{error}</div>
      )}

      {/* Submit */}
      <div style={{ padding: '0 1rem 2rem' }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            ...styles.submitBtn,
            ...(submitting ? { opacity: 0.6 } : {}),
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Response'}
        </button>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        Powered by ElectionCaffe
      </div>
    </div>
  );
}

// ── Inline styles (no dependency on any UI library) ──

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    maxWidth: '640px',
    margin: '0 auto',
    paddingBottom: '2rem',
  },
  header: {
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    color: '#fff',
    padding: '2rem 1.5rem 1.5rem',
    borderRadius: '0 0 1.5rem 1.5rem',
  },
  headerTitle: {
    fontSize: '1.4rem',
    fontWeight: 700,
    marginBottom: '.25rem',
  },
  headerLocal: {
    fontSize: '.9rem',
    opacity: 0.85,
    marginBottom: '.25rem',
  },
  headerDesc: {
    fontSize: '.82rem',
    opacity: 0.75,
    marginTop: '.5rem',
  },
  headerMeta: {
    fontSize: '.72rem',
    opacity: 0.6,
    marginTop: '.75rem',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    margin: '1rem',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  sectionTitle: {
    fontSize: '.85rem',
    fontWeight: 700,
    color: '#475569',
    marginBottom: '.75rem',
  },
  inputGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '.5rem',
  },
  input: {
    width: '100%',
    padding: '.6rem .75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '.85rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  qHeader: {
    display: 'flex',
    gap: '.75rem',
    alignItems: 'flex-start',
    marginBottom: '.75rem',
  },
  qNum: {
    background: '#7c3aed',
    color: '#fff',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    minWidth: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '.75rem',
    fontWeight: 700,
  },
  qText: {
    fontSize: '.9rem',
    fontWeight: 600,
    color: '#1e293b',
    lineHeight: 1.4,
  },
  reqBadge: {
    fontSize: '.6rem',
    color: '#ef4444',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '.03em',
  },
  qBody: {
    paddingLeft: '2.75rem',
  },
  option: {
    display: 'block',
    padding: '.55rem .75rem',
    marginBottom: '.4rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '.85rem',
    color: '#334155',
    cursor: 'pointer',
    transition: 'all .15s',
  },
  optionSelected: {
    borderColor: '#7c3aed',
    background: '#f5f3ff',
    color: '#6d28d9',
    fontWeight: 600,
  },
  ynBtn: {
    flex: 1,
    padding: '.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    background: '#fff',
    color: '#475569',
    transition: 'all .15s',
  },
  ynYes: {
    borderColor: '#10b981',
    background: '#ecfdf5',
    color: '#059669',
  },
  ynNo: {
    borderColor: '#ef4444',
    background: '#fef2f2',
    color: '#dc2626',
  },
  scaleBtn: {
    padding: '.5rem .75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '.8rem',
    cursor: 'pointer',
    background: '#fff',
    color: '#475569',
    fontWeight: 600,
    transition: 'all .15s',
  },
  scaleBtnActive: {
    borderColor: '#f59e0b',
    background: '#fffbeb',
    color: '#d97706',
  },
  textarea: {
    width: '100%',
    padding: '.6rem .75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '.85rem',
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  rankNum: {
    background: '#7c3aed',
    color: '#fff',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    minWidth: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '.65rem',
    fontWeight: 700,
  },
  errorBar: {
    margin: '0 1rem',
    padding: '.75rem 1rem',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '.82rem',
    fontWeight: 500,
    marginBottom: '.75rem',
  },
  submitBtn: {
    width: '100%',
    padding: '1rem',
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity .15s',
  },
  footer: {
    textAlign: 'center' as const,
    color: '#94a3b8',
    fontSize: '.72rem',
    padding: '1rem 0',
  },
  loadingDots: {
    display: 'flex',
    justifyContent: 'center',
    gap: '.5rem',
    padding: '2rem 0',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#7c3aed',
    animation: 'pulse 1s infinite',
  },
};
