import type { AnalysisRequest, AnalysisResult, LLMProvider } from './types';

export class OpenAIService implements LLMProvider {
    async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
        const prompt = await this.constructPrompt(request);

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${request.apiKey}`,
                },
                body: JSON.stringify({
                    model: request.model || 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a senior options trader. Return ONLY valid JSON matching this structure. IMPORTANT: All string values (comments, cases, reasons, etc.) MUST be in the requested language (e.g. Chinese if requested).
              {
                "macroScore": number (1-10),
                "macroComment": "string",
                "techScore": number (1-10),
                "techComment": "string",
                "mainConflict": "string",
                "bullCase": ["string", "string", "string"],
                "bearCase": ["string", "string", "string"],
                "verdict": {
                  "direction": "Long" | "Short" | "Neutral",
                  "strategyType": "string",
                  "contract": "string",
                  "expiration": "string",
                  "strikes": "string",
                  "entryReason": "string"
                },
                "tradeManagement": {
                  "entry": "string",
                  "target": "string",
                  "stop": "string"
                }
              }`
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            // Parse JSON from content (handle potential markdown code blocks)
            const jsonStr = content.replace(/```json\n|\n```/g, '').trim();
            const result = JSON.parse(jsonStr);

            return {
                ...result,
                rawResponse: content
            };
        } catch (error) {
            console.error('Analysis failed:', error);
            throw error;
        }
    }

    async testConnection(apiKey: string): Promise<boolean> {
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });
            return response.ok;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    async fetchModels(apiKey: string): Promise<string[]> {
        const defaultModels = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
        try {
            if (!apiKey) return defaultModels;

            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });
            if (!response.ok) return defaultModels;
            const data = await response.json();
            const models = data.data.map((m: any) => m.id).filter((id: string) => id.includes('gpt'));
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
            ['股票代码', request.ticker || '-'],
            ['当前股价', request.price || '-'],
            ['技术指标 (RSI / MACD)', `${request.rsi || '-'} / ${request.macd || '-'}`],
            ['IV 排名', request.ivRank || '-'],
            ['关键点位 (支撑/阻力)', `${request.support || '-'} / ${request.resistance || '-'}`],
            ['账户资金总数', `$${request.accountBalance || '700'}`],
            [timestampLabel, new Date().toISOString()]
        ] : [
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
}
