import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { toPng } from 'html-to-image';
import type { AnalysisResult as AnalysisResultType } from '../../services/llm/types';

interface AnalysisResultProps {
    result: AnalysisResultType;
    ticker: string;
    onReset: () => void;
    onReanalyze: () => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, ticker, onReset, onReanalyze }) => {
    const { t } = useTranslation();
    const resultRef = useRef<HTMLDivElement>(null);

    const handleSaveImage = async () => {
        if (resultRef.current) {
            try {
                const element = resultRef.current;
                // Store original margin
                const originalMargin = element.style.margin;
                // Temporarily remove margin for clean capture
                element.style.margin = '0';

                const dataUrl = await toPng(element, {
                    quality: 1,
                    pixelRatio: 2,
                    backgroundColor: '#0f172a',
                    cacheBust: true,
                    filter: (node) => {
                        // Filter out elements that shouldn't be captured
                        const exclusionClasses = ['animate-ping', 'animate-pulse'];
                        return !exclusionClasses.some(className =>
                            node.classList?.contains(className)
                        );
                    },
                    width: element.offsetWidth,
                    height: element.scrollHeight,
                });

                // Restore original margin
                element.style.margin = originalMargin;

                const link = document.createElement('a');
                link.download = `${ticker}_analysis.png`;
                link.href = dataUrl;
                link.click();
            } catch (error) {
                console.error('Failed to save image:', error);
                // Restore margin in case of error
                if (resultRef.current) {
                    resultRef.current.style.margin = '';
                }
            }
        }
    };

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSaveImage}
                        className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        {t('analysis.save_image')}
                    </button>
                    <button
                        onClick={onReanalyze}
                        className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {t('analysis.reanalyze')}
                    </button>
                </div>
                <div className="bg-slate-900 text-slate-400 text-xs px-4 py-2 rounded-full border border-slate-800 font-mono">
                    {t('analysis.target')}: <span className="text-emerald-400">{ticker}</span> | {t('analysis.data_locked')}
                </div>
            </div>

            <div ref={resultRef} className="glass-panel rounded-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500"></div>

                {/* Ticker Header */}
                <div className="p-6 pb-4 border-b border-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="text-xs text-slate-500 uppercase tracking-wider">{t('analysis.target')}</div>
                        <div className="text-2xl font-bold text-white font-mono tracking-wider">{ticker}</div>
                        <div className="ml-auto text-xs text-slate-500 font-mono">{t('analysis.data_locked')}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-6 border-b border-slate-800">
                    <div>
                        <div className="text-xs text-slate-500 uppercase mb-1">{t('analysis.macro_score')}</div>
                        <div className="text-2xl font-bold text-white flex items-baseline gap-2">
                            {result.macroScore}/10 <span className="text-sm font-normal text-slate-400">{result.macroComment}</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase mb-1">{t('analysis.tech_score')}</div>
                        <div className="text-2xl font-bold text-white flex items-baseline gap-2">
                            {result.techScore}/10 <span className="text-sm font-normal text-slate-400">{result.techComment}</span>
                        </div>
                    </div>
                    <div className="col-span-2 mt-2">
                        <div className="text-xs text-slate-500 uppercase mb-1">{t('analysis.main_conflict')}</div>
                        <p className="text-sm text-slate-300">
                            {result.mainConflict}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 p-6 pb-0">
                    <div className="bg-emerald-950/10 border border-emerald-900/30 p-4 rounded-lg">
                        <h3 className="text-emerald-500 font-bold text-sm mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            {t('analysis.bull_case')}
                        </h3>
                        <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
                            {result.bullCase.map((item, index) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-rose-950/10 border border-rose-900/30 p-4 rounded-lg">
                        <h3 className="text-rose-500 font-bold text-sm mb-3 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4" />
                            {t('analysis.bear_case')}
                        </h3>
                        <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
                            {result.bearCase.map((item, index) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="p-6">
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                {t('analysis.verdict')}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded text-xs font-mono border bg-amber-950/30 text-amber-400 border-amber-800/50">
                                {result.verdict.direction} / {result.verdict.strategyType}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 font-mono text-sm">
                            <div className={result.verdict.contract === 'Shares' || result.verdict.contract === 'Stock' ? "col-span-2" : ""}>
                                <div className="text-slate-500 text-xs">{t('analysis.contract')}</div>
                                <div className="text-emerald-400">{result.verdict.contract}</div>
                            </div>
                            {result.verdict.contract !== 'Shares' && result.verdict.contract !== 'Stock' && (
                                <>
                                    <div>
                                        <div className="text-slate-500 text-xs">{t('analysis.expiration')}</div>
                                        <div className="text-white">{result.verdict.expiration}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="text-slate-500 text-xs">{t('analysis.strikes')}</div>
                                        <div className="text-white">{result.verdict.strikes}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm bg-slate-900/30 p-4 border-t border-slate-800">
                    <div className="flex gap-4">
                        <div>
                            <span className="text-slate-500 mr-2">{t('analysis.entry')}:</span>
                            <span className="text-white">{result.tradeManagement.entry}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 mr-2">{t('analysis.target')}:</span>
                            <span className="text-emerald-400">{result.tradeManagement.target}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 mr-2">{t('analysis.stop')}:</span>
                            <span className="text-rose-400">{result.tradeManagement.stop}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                        <AlertTriangle className="w-3 h-3" />
                        {t('analysis.risk_managed')}
                    </div>
                </div>
            </div>

            <div className="text-center">
                <button onClick={onReset} className="text-xs text-slate-500 hover:text-slate-300 underline flex items-center justify-center gap-1 mx-auto">
                    <RefreshCw className="w-3 h-3" />
                    {t('analysis.analyze_another')}
                </button>
            </div>
        </div>
    );
};
