import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnalysisForm } from './AnalysisForm';
import { AnalysisResult } from './AnalysisResult';
import type { AnalysisRequest, AnalysisResult as AnalysisResultType } from '../../services/llm/types';
import { LLMServiceFactory } from '../../services/llm/factory';
import { Activity } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { HistoryService } from '../../services/history/HistoryService';

export const AnalysisContainer: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const [stage, setStage] = useState<'ingestion' | 'analysis'>('ingestion');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResultType | null>(null);
    const [currentTicker, setCurrentTicker] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [lastRequest, setLastRequest] = useState<AnalysisRequest | null>(null);

    // Load from history if present in location state
    React.useEffect(() => {
        const historyItem = location.state?.historyItem;
        if (historyItem) {
            setResult(historyItem.result);
            setCurrentTicker(historyItem.request.ticker);
            setStage('analysis');
            // Clear state so refresh doesn't reload it? Or keep it? keeping it is fine.
            // Actually, better to clear it to avoid confusion if they navigate away and back?
            // For now, let's just load it.
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleAnalysis = async (request: AnalysisRequest) => {
        setIsLoading(true);
        setError(null);
        setCurrentTicker(request.ticker);
        setLastRequest(request);

        try {
            const provider = LLMServiceFactory.getProvider(request.provider);
            const accountBalance = localStorage.getItem('llm_account_balance') || '700';
            const analysisResult = await provider.analyze({ ...request, accountBalance });
            setResult(analysisResult);
            setStage('analysis');
            HistoryService.save(request, analysisResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReanalyze = async () => {
        if (!lastRequest) {
            setStage('ingestion');
            return;
        }
        await handleAnalysis(lastRequest);
    };

    const handleReset = () => {
        setStage('ingestion');
        setResult(null);
        setError(null);
    };

    return (
        <>
            <div className="flex gap-4 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex-shrink-0 flex items-center justify-center border border-indigo-500/30">
                    <Activity className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-300">{t('intro.role')}</div>
                    <div className="text-slate-400 text-sm leading-relaxed max-w-xl">
                        {t('intro.message')}
                        <br /><br />
                        <span dangerouslySetInnerHTML={{ __html: t('intro.instruction').replace('<1>', '<span class="text-emerald-400 font-mono">').replace('</1>', '</span>') }} />
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-rose-950/30 border border-rose-900/50 text-rose-400 p-4 rounded-lg text-sm">
                    Error: {error}
                </div>
            )}

            {stage === 'ingestion' ? (
                <AnalysisForm onSubmit={handleAnalysis} isLoading={isLoading} />
            ) : (
                result && <AnalysisResult result={result} ticker={currentTicker} onReset={handleReset} onReanalyze={handleReanalyze} />
            )}
        </>
    );
};
