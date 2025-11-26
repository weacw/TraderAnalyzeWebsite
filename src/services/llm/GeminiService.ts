import type { AnalysisRequest, AnalysisResult, LLMProvider } from './types';

export class GeminiService implements LLMProvider {
    async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
        const prompt = await this.constructPrompt(request);
        console.log(prompt);
        try {
            const model = request.model || 'gemini-2.5-flash';
            console.log(request.model);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${request.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    tools: [
                        { google_search: {} } // 开启 Google 搜索能力
                    ]
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.candidates[0]?.content?.parts?.[0]?.text ?? '';

            try {
                const jsonStr = content.replace(/```json\n|\n```/g, '').trim();
                const result = JSON.parse(jsonStr);
                return {
                    ...result,
                    rawResponse: content
                };
            } catch {
                const parsed = this.parseNarrative(content, request.language.toLowerCase().includes('chinese'));
                return {
                    ...parsed,
                    rawResponse: content
                };
            }
        } catch (error) {
            console.error('Analysis failed:', error);
            throw error;
        }
    }

    async testConnection(apiKey: string): Promise<boolean> {
        try {
            // Gemini doesn't have a simple "list models" endpoint that works exactly like OpenAI's for auth check without a project ID sometimes,
            // but we can try a minimal generation or list models if available. 
            // Using models.list requires less payload.
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
                method: 'GET',
            });
            return response.ok;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    async fetchModels(apiKey: string): Promise<string[]> {
        const defaultModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
        try {
            if (!apiKey) return defaultModels;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
                method: 'GET',
            });
            if (!response.ok) return defaultModels;
            const data = await response.json();
            const models = data.models.map((m: any) => m.name.replace('models/', '')).filter((id: string) => id.includes('gemini'));
            return models.length > 0 ? models : defaultModels;
        } catch (error) {
            console.error('Failed to fetch models:', error);
            return defaultModels;
        }
    }

    private async constructPrompt(request: AnalysisRequest): Promise<string> {
        const url = new URL('../../../prompt.md', import.meta.url);
        const template = await fetch(url).then(r => r.text());

        const isCn = request.language.toLowerCase().includes('chinese');
        const heading = isCn ? '## 当前市场数据' : '## Current Market Data';
        const sourceHeading = isCn ? '### 数据来源' : '### Data Source';
        const disclaimerHeading = isCn ? '### 免责声明' : '### Disclaimer';
        const timestampLabel = isCn ? '数据更新时间' : 'Data Timestamp';
        const tableHeader = isCn ? '| 字段 | 值 |\n|---|---|' : '| Field | Value |\n|---|---|';

        const fields: [string, string][] = isCn ? [
            ['分析类型', request.analysisType === 'underlying' ? '标的股 (Underlying)' : '期权 (Options)'],
            ['股票代码', request.ticker || '-'],
            ['当前股价', request.price || '-'],
            ['技术指标 (RSI / MACD)', `${request.rsi || '-'} / ${request.macd || '-'}`],
            ['IV 排名', request.ivRank || '-'],
            ['关键点位 (支撑/阻力)', `${request.support || '-'} / ${request.resistance || '-'}`],
            ['账户资金总数', `$${request.accountBalance || '700'}`],
            [timestampLabel, new Date().toISOString()]
        ] : [
            ['Analysis Type', request.analysisType === 'underlying' ? 'Underlying Stock' : 'Options'],
            ['Ticker', request.ticker || '-'],
            ['Current Price', request.price || '-'],
            ['Indicators (RSI / MACD)', `${request.rsi || '-'} / ${request.macd || '-'}`],
            ['IV Rank', request.ivRank || '-'],
            ['Key Levels (Support/Resistance)', `${request.support || '-'} / ${request.resistance || '-'}`],
            ['Account Balance', `$${request.accountBalance || '700'}`],
            [timestampLabel, new Date().toISOString()]
        ];

        const tableRows = fields.map(([k, v]) => `| ${k} | ${v} |`).join('\n');

        const sourceText = isCn
            ? '本数据由用户在前端表单录入，未经过第三方数据源校验。'
            : 'Data provided by user via frontend form; not validated against third-party sources.';
        const disclaimerText = isCn
            ? '以上信息仅用于策略生成的参考，不构成任何投资建议。模型输出可能存在偏差，请结合自身风险承受能力独立判断与执行。'
            : 'Information is for strategy reference only and does not constitute investment advice. Model outputs may be biased; exercise independent judgment and risk control.';

        const marketDataSection = `\n${heading}\n\n${tableHeader}\n${tableRows}\n\n${sourceHeading}\n\n${sourceText}\n\n${disclaimerHeading}\n\n${disclaimerText}\n`;

        const stage2Index = template.indexOf('**阶段二');
        if (stage2Index === -1) {
            return `${template}\n${marketDataSection}`;
        }
        const beforeStage2 = template.slice(0, stage2Index);
        const afterStage2 = template.slice(stage2Index);
        return `${beforeStage2}\n${marketDataSection}\n${afterStage2}`;
    }

    private parseNarrative(text: string, isCn: boolean): AnalysisResult {
        const pickNumber = (re: RegExp) => {
            const m = text.match(re);
            return m ? Number(m[1]) : 0;
        };
        const pickLine = (re: RegExp) => {
            const m = text.match(re);
            return m ? m[1].trim() : '';
        };

        const macroScore = isCn ? pickNumber(/宏观评分[:：]\s*(\d+)/) : pickNumber(/Macro\s*Score[:：]\s*(\d+)/i);
        const techScore = isCn ? pickNumber(/技术评分[:：]\s*(\d+)/) : pickNumber(/Technical\s*Score[:：]\s*(\d+)/i);
        const directionRaw = isCn ? pickLine(/方向[:：]\s*([^\n]+)/) : pickLine(/Direction[:：]\s*([^\n]+)/i);
        const strategyType = isCn ? pickLine(/策略类型[:：]\s*([^\n]+)/) : pickLine(/Strategy\s*Type[:：]\s*([^\n]+)/i);
        const contract = isCn ? pickLine(/合约类型[:：]\s*([^\n]+)/) : pickLine(/Contract[:：]\s*([^\n]+)/i);
        const expiration = isCn ? pickLine(/到期日[:：]\s*([^\n]+)/) : pickLine(/Expiration[:：]\s*([^\n]+)/i);
        const strikes = isCn ? pickLine(/行权价[:：]\s*([^\n]+)/) : pickLine(/Strikes[:：]\s*([^\n]+)/i);
        const entry = isCn ? pickLine(/入场价\s*\(Entry\)[:：]\s*([^\n]+)/) : pickLine(/Entry[:：]\s*([^\n]+)/i);
        const target = isCn ? pickLine(/止盈\s*\(Target\)[:：]\s*([^\n]+)/) : pickLine(/Target[:：]\s*([^\n]+)/i);
        const stop = isCn ? pickLine(/止损\s*\(Stop\)[:：]\s*([^\n]+)/) : pickLine(/Stop[:：]\s*([^\n]+)/i);

        const normDirection = (() => {
            const d = directionRaw.toLowerCase();
            if (['long', '看多'].some(x => d.includes(x))) return 'Long';
            if (['short', '看空'].some(x => d.includes(x))) return 'Short';
            return 'Neutral';
        })();

        return {
            macroScore,
            macroComment: '',
            techScore,
            techComment: '',
            mainConflict: '',
            bullCase: [],
            bearCase: [],
            verdict: {
                direction: normDirection as 'Long' | 'Short' | 'Neutral',
                strategyType: strategyType || (isCn ? '策略' : 'Strategy'),
                contract,
                expiration,
                strikes,
                entryReason: ''
            },
            tradeManagement: {
                entry,
                target,
                stop
            },
            rawResponse: text
        };
    }
}
