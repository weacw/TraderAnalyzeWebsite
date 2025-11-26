export interface AnalysisRequest {
    ticker: string;
    price: string;
    analysisType: 'options' | 'underlying';
    ivRank?: string;
    hvRank?: string;
    support: string;
    resistance: string;
    rsi: string;
    macd: string;
    apiKey: string;
    provider: 'openai' | 'gemini' | 'doubao';
    language: string;
    model?: string;
    accountBalance?: string;
}

export interface AnalysisResult {
    macroScore: number;
    macroComment: string;
    techScore: number;
    techComment: string;
    mainConflict: string;
    bullCase: string[];
    bearCase: string[];
    verdict: {
        direction: 'Long' | 'Short' | 'Neutral';
        strategyType: string;
        contract: string;
        expiration: string;
        strikes: string;
        entryReason: string;
    };
    tradeManagement: {
        entry: string;
        target: string;
        stop: string;
    };
    rawResponse: string;
}

export interface LLMProvider {
    analyze(request: AnalysisRequest): Promise<AnalysisResult>;
    testConnection(apiKey: string): Promise<boolean>;
    fetchModels(apiKey: string): Promise<string[]>;
}
