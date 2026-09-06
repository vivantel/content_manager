export interface LLMProvider {
  name: string;
  generate(prompt: string, options?: LLMOptions): Promise<LLMResponse>;
  healthCheck(): Promise<boolean>;
  getModels(): string[];
}

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
}

export interface LLMResponse {
  content: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  provider: string;
}

export interface LLMProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
  defaultModel?: string;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAIResponse {
  choices: Array<{
    message: { content: string };
    index: number;
  }>;
  model: string;
  usage?: OpenAIUsage;
}

export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;
  protected config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  abstract generate(prompt: string, options?: LLMOptions): Promise<LLMResponse>;
  abstract healthCheck(): Promise<boolean>;
  abstract getModels(): string[];

  protected getModel(options?: LLMOptions): string {
    return options?.model || this.config.defaultModel || this.getModels()[0];
  }

  protected async makeRequest(
    url: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  protected async makeTypedRequest<T>(
    url: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const response = await this.makeRequest(url, body, headers);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Request failed: ${response.status} ${error}`);
    }
    return response.json() as Promise<T>;
  }

  protected parseUsage(usage: OpenAIUsage | undefined): LLMResponse['tokens'] {
    return {
      prompt: usage?.prompt_tokens || 0,
      completion: usage?.completion_tokens || 0,
      total: usage?.total_tokens || 0,
    };
  }
}

export class OpenRouterProvider extends BaseLLMProvider {
  name = 'openrouter';
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(config: LLMProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || this.baseUrl;
  }

  getModels(): string[] {
    return this.config.models || [
      'meta-llama/llama-3.1-8b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
      'google/gemma-2-9b-it:free',
      'nousresearch/hermes-3-llama-3.1-8b:free',
    ];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generate(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const model = this.getModel(options);
    
    const data = await this.makeTypedRequest<OpenAIResponse>(
      `${this.baseUrl}/chat/completions`,
      {
        model,
        messages: [
          ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: options?.maxTokens || 4000,
        temperature: options?.temperature ?? 0.7,
        response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      },
      {
        Authorization: `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://vivascribe.dev',
        'X-Title': 'VivaScribe',
      }
    );

    const choice = data.choices[0];

    return {
      content: choice.message.content,
      tokens: this.parseUsage(data.usage),
      model: data.model,
      provider: this.name,
    };
  }
}

export class NVIDIAProvider extends BaseLLMProvider {
  name = 'nvidia';
  private baseUrl = 'https://integrate.api.nvidia.com/v1';

  constructor(config: LLMProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || this.baseUrl;
  }

  getModels(): string[] {
    return this.config.models || [
      'nvidia/nemotron-3-ultra',
      'meta/llama-3.1-70b-instruct',
      'microsoft/phi-3-medium-128k-instruct',
    ];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generate(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const model = this.getModel(options);
    
    const data = await this.makeTypedRequest<OpenAIResponse>(
      `${this.baseUrl}/chat/completions`,
      {
        model,
        messages: [
          ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: options?.maxTokens || 4000,
        temperature: options?.temperature ?? 0.7,
        response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      },
      {
        Authorization: `Bearer ${this.config.apiKey}`,
      }
    );

    const choice = data.choices[0];

    return {
      content: choice.message.content,
      tokens: this.parseUsage(data.usage),
      model: data.model,
      provider: this.name,
    };
  }
}

export class GitHubModelsProvider extends BaseLLMProvider {
  name = 'github_models';
  private baseUrl = 'https://models.inference.ai.azure.com';

  constructor(config: LLMProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || this.baseUrl;
  }

  getModels(): string[] {
    return this.config.models || [
      'gpt-4o-mini',
      'gpt-4o',
      'phi-3-medium-128k-instruct',
      'mistral-large',
    ];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generate(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const model = this.getModel(options);
    
    const data = await this.makeTypedRequest<OpenAIResponse>(
      `${this.baseUrl}/chat/completions`,
      {
        model,
        messages: [
          ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: options?.maxTokens || 4000,
        temperature: options?.temperature ?? 0.7,
        response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      },
      {
        Authorization: `Bearer ${this.config.apiKey}`,
      }
    );

    const choice = data.choices[0];

    return {
      content: choice.message.content,
      tokens: this.parseUsage(data.usage),
      model: data.model,
      provider: this.name,
    };
  }
}

interface GoogleAIUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

interface GoogleAIResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
  usageMetadata?: GoogleAIUsageMetadata;
}

export class GoogleAIProvider extends BaseLLMProvider {
  name = 'google_ai';
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: LLMProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || this.baseUrl;
  }

  getModels(): string[] {
    return this.config.models || [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-1.0-pro',
    ];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/models?key=${this.config.apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async generate(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const model = this.getModel(options);
    
    const data = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            ...(options?.systemPrompt ? [{ role: 'user', parts: [{ text: `System: ${options.systemPrompt}` }] }] : []),
            { role: 'user', parts: [{ text: prompt }] },
          ],
          generationConfig: {
            maxOutputTokens: options?.maxTokens || 4000,
            temperature: options?.temperature ?? 0.7,
            responseMimeType: options?.responseFormat === 'json' ? 'application/json' : 'text/plain',
          },
        }),
      }
    ).then(async (res) => {
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Google AI API error: ${res.status} ${error}`);
      }
      return res.json() as Promise<GoogleAIResponse>;
    });

    const content = data.candidates[0]?.content?.parts[0]?.text || '';

    return {
      content,
      tokens: {
        prompt: data.usageMetadata?.promptTokenCount || 0,
        completion: data.usageMetadata?.candidatesTokenCount || 0,
        total: data.usageMetadata?.totalTokenCount || 0,
      },
      model,
      provider: this.name,
    };
  }
}

export class LLMProviderFactory {
  private static providers: Map<string, LLMProvider> = new Map();

  static register(name: string, provider: LLMProvider) {
    this.providers.set(name, provider);
  }

  static get(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  static getAll(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  static async getHealthyProvider(preferredOrder: string[] = ['github_models', 'openrouter', 'nvidia', 'google_ai']): Promise<LLMProvider | null> {
    for (const name of preferredOrder) {
      const provider = this.providers.get(name);
      if (provider && await provider.healthCheck()) {
        return provider;
      }
    }
    return null;
  }
}

export function initializeProviders(config: {
  openrouter?: LLMProviderConfig;
  nvidia?: LLMProviderConfig;
  githubModels?: LLMProviderConfig;
  googleAI?: LLMProviderConfig;
}) {
  if (config.openrouter?.apiKey) {
    LLMProviderFactory.register('openrouter', new OpenRouterProvider(config.openrouter));
  }
  if (config.nvidia?.apiKey) {
    LLMProviderFactory.register('nvidia', new NVIDIAProvider(config.nvidia));
  }
  if (config.githubModels?.apiKey) {
    LLMProviderFactory.register('github_models', new GitHubModelsProvider(config.githubModels));
  }
  if (config.googleAI?.apiKey) {
    LLMProviderFactory.register('google_ai', new GoogleAIProvider(config.googleAI));
  }
}