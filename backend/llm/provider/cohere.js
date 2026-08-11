/**
 * Cohere LLM provider abstraction.
 * Key only from env COHERE_API_KEY — never hardcode.
 */

const COHERE_API = 'https://api.cohere.com/v2/chat';

export class CohereProvider {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.COHERE_API_KEY || '';
    this.model =
      options.model ||
      process.env.COHERE_MODEL ||
      'command-a-03-2025';
    this.timeoutMs = Number(
      options.timeoutMs || process.env.COHERE_TIMEOUT_MS || 60000
    );
    this.maxTokens = Number(options.maxTokens || process.env.COHERE_MAX_TOKENS || 2048);
  }

  ensureConfigured() {
    if (!this.apiKey) {
      throw new Error(
        'COHERE_API_KEY is not configured. Set it in the server environment (never in the browser).'
      );
    }
  }

  /**
   * Chat with optional tools (Cohere v2).
   * messages: [{ role: 'system'|'user'|'assistant'|..., content: string | content blocks }]
   */
  async chat({ messages, tools, toolResults, temperature = 0.2 } = {}) {
    this.ensureConfigured();

    const body = {
      model: this.model,
      messages,
      temperature,
      max_tokens: this.maxTokens,
      // strict_tools rejects tools whose parameters have required:[] or empty properties.
      // Our analytics tools have many optional filters — keep flexible.
      strict_tools: false,
    };

    if (tools?.length) {
      body.tools = normalizeToolsForCohere(tools);
    }
    // Cohere v2 uses tool call results as messages with role tool
    // We pass them inside messages already in agent runtime.

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(COHERE_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Cohere non-JSON response (${res.status}): ${text.slice(0, 200)}`);
      }

      if (!res.ok) {
        const msg = data?.message || data?.error || text.slice(0, 300);
        throw new Error(`Cohere API ${res.status}: ${msg}`);
      }

      return normalizeChatResponse(data);
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Cohere rejects tools with empty property maps / empty required lists under strict mode.
 * Always ensure a valid JSON-schema object shape.
 */
function normalizeToolsForCohere(tools = []) {
  return tools.map((t) => {
    const fn = t.function || t;
    const params = fn.parameters || { type: 'object', properties: {} };
    let properties = params.properties && typeof params.properties === 'object'
      ? { ...params.properties }
      : {};
    let required = Array.isArray(params.required) ? [...params.required] : [];

    if (!Object.keys(properties).length) {
      // Zero-arg tools (e.g. get_store_info, get_clock_context)
      properties = {
        _unused: {
          type: 'string',
          description: 'Optional unused placeholder for schema validity',
        },
      };
    }

    // If any property is present but required is empty, leave as-is when strict is off.
    // If required points to missing keys, drop them.
    required = required.filter((k) => Object.prototype.hasOwnProperty.call(properties, k));

    return {
      type: 'function',
      function: {
        name: fn.name,
        description: fn.description || '',
        parameters: {
          type: 'object',
          properties,
          ...(required.length ? { required } : {}),
        },
      },
    };
  });
}

function extractText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === 'string') return c;
        if (c?.type === 'text') return c.text || '';
        if (c?.text) return c.text;
        return '';
      })
      .join('');
  }
  if (content.text) return content.text;
  return '';
}

/**
 * Normalize Cohere v2 chat response into:
 * { text, toolCalls: [{ id, name, arguments }], usage, raw, finishReason }
 */
export function normalizeChatResponse(data) {
  const message = data.message || data;
  const text = extractText(message.content);

  let toolCalls = [];
  const rawTools = message.tool_calls || message.toolCalls || data.tool_calls || [];
  if (Array.isArray(rawTools) && rawTools.length) {
    toolCalls = rawTools.map((tc, i) => {
      const fn = tc.function || tc;
      let args = fn.arguments ?? tc.parameters ?? tc.arguments ?? {};
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args);
        } catch {
          args = {};
        }
      }
      return {
        id: tc.id || `tool_${i}`,
        name: fn.name || tc.name,
        arguments: args || {},
      };
    });
  }

  // Fallback: content blocks with type tool_use
  if (!toolCalls.length && Array.isArray(message.content)) {
    for (const block of message.content) {
      if (block.type === 'tool_use' || block.type === 'tool-call') {
        let args = block.input || block.arguments || {};
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args);
          } catch {
            args = {};
          }
        }
        toolCalls.push({
          id: block.id || block.tool_call_id || `tool_${toolCalls.length}`,
          name: block.name || block.tool_name,
          arguments: args,
        });
      }
    }
  }

  const usage = {
    input: data.usage?.tokens?.input_tokens ?? data.meta?.tokens?.input_tokens ?? 0,
    output: data.usage?.tokens?.output_tokens ?? data.meta?.tokens?.output_tokens ?? 0,
  };

  return {
    text,
    toolCalls,
    usage,
    finishReason: data.finish_reason || data.finishReason || null,
    rawMessage: message,
    raw: data,
  };
}

export function createLlmProvider() {
  return new CohereProvider();
}
