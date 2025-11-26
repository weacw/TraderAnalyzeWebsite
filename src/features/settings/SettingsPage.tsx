import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LLMServiceFactory } from '../../services/llm/factory';

export const SettingsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [apiKey, setApiKey] = useState('');
    const [accountBalance, setAccountBalance] = useState('700');
    const [provider, setProvider] = useState<'openai' | 'gemini' | 'doubao'>('openai');
    const [saved, setSaved] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [models, setModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [isLoadingModels, setIsLoadingModels] = useState(false);



    useEffect(() => {
        const storedApiKey = localStorage.getItem('llm_api_key') || '';
        const storedBalance = localStorage.getItem('llm_account_balance') || '700';
        const storedProvider = (localStorage.getItem('llm_provider') as 'openai' | 'gemini' | 'doubao') || 'openai';
        const storedModel = localStorage.getItem('llm_model') || '';

        setApiKey(storedApiKey);
        setAccountBalance(storedBalance);
        setProvider(storedProvider);
        setSelectedModel(storedModel);



        if (storedApiKey) {
            fetchModels(storedProvider, storedApiKey);
        }
    }, []);

    const fetchModels = async (currentProvider: string, currentKey: string) => {
        setIsLoadingModels(true);
        try {
            const service = LLMServiceFactory.getProvider(currentProvider as any);
            const fetchedModels = await service.fetchModels(currentKey);
            setModels(fetchedModels);

            // If currently selected model is not in the list (and list is not empty), select the first one
            // Or if no model is selected, select the first one
            const storedModel = localStorage.getItem('llm_model');
            if (fetchedModels.length > 0) {
                if (!storedModel || !fetchedModels.includes(storedModel)) {
                    setSelectedModel(fetchedModels[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch models', error);
        } finally {
            setIsLoadingModels(false);
        }
    };

    // Refetch models when provider or api key changes (debounced or on blur/save ideally, but here maybe just on effect if key exists)
    useEffect(() => {
        if (apiKey && provider) {
            // Debounce could be good here, but for now let's just fetch
            const timer = setTimeout(() => {
                fetchModels(provider, apiKey);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setModels([]);
        }
    }, [apiKey, provider]);

    const handleSave = () => {
        localStorage.setItem('llm_api_key', apiKey);
        localStorage.setItem('llm_account_balance', accountBalance);
        localStorage.setItem('llm_provider', provider);
        localStorage.setItem('llm_model', selectedModel);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleTestConnection = async () => {
        if (!apiKey) {
            setTestResult({ success: false, message: t('settings.enter_api_key_first') });
            return;
        }

        setIsTesting(true);
        setTestResult(null);

        try {
            const service = LLMServiceFactory.getProvider(provider);
            const success = await service.testConnection(apiKey);
            if (success) {
                setTestResult({ success: true, message: t('settings.connection_success') });
            } else {
                setTestResult({ success: false, message: t('settings.connection_failed') });
            }
        } catch (error) {
            setTestResult({ success: false, message: t('settings.connection_error') });
        } finally {
            setIsTesting(false);
        }
    };



    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-white">{t('settings.title')}</h2>
            </div>

            <div className="glass-panel rounded-xl p-6 border-l-4 border-l-emerald-500 shadow-2xl shadow-black/50">
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                            {t('settings.provider')}
                        </label>
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value as any)}
                            className="input-field"
                        >
                            <option value="openai">OpenAI (GPT-4)</option>
                            <option value="gemini">Google Gemini</option>
                            <option value="doubao">Doubao</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                            {t('settings.api_key')}
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="input-field"
                            placeholder={t('settings.api_key_placeholder')}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                            {t('settings.account_balance')} ($)
                        </label>
                        <input
                            type="number"
                            value={accountBalance}
                            onChange={(e) => setAccountBalance(e.target.value)}
                            className="input-field"
                            placeholder="700"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                            {t('settings.model')}
                        </label>
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="input-field"
                            disabled={isLoadingModels || models.length === 0}
                        >
                            {models.length === 0 && <option value="">{isLoadingModels ? t('settings.loading_models') : t('settings.no_models')}</option>}
                            {models.map(model => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </select>
                    </div>

                    {testResult && (
                        <div className={`text-xs p-3 rounded-lg ${testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {testResult.message}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={handleTestConnection}
                            disabled={isTesting || !apiKey}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            {isTesting ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <Wifi className="w-4 h-4" />
                            )}
                            {t('settings.test_connection')}
                        </button>

                        <button
                            onClick={handleSave}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {saved ? t('settings.saved') : t('settings.save')}
                        </button>
                    </div>
                </div>
            </div>


        </div>
    );
};
