import crypto from 'crypto';
import { createLlmProvider } from '../provider/cohere.js';
import { getCohereToolDefs, executeTool } from '../tools/registry.js';
import { setToolContext, clearToolContext } from '../tools/context.js';
import { semanticContextForPrompt } from '../semantic/picosoModel.js';
import {
  getOrCreateConversation,
  buildContextMessages,
  appendTurn,
  learnEpisode,
  loadRecentLearning,
} from './memory.js';
import { validateMetricResult } from '../query/validator.js';
import { LlmAgentRun, LlmToolExecution } from '../models/llmModels.js';
import { sanitizeCustomerRow } from '../pii.js';
import {
  matchTemplate,
  extractRadiusKm,
  extractDays,
  extractDateRange,
  isAnalyticsIntent,
  extractProductQuery,
  extractStatusFilter,
} from '../templates.js';
import { STORE_LOCATION } from '../semantic/picosoModel.js';
import {
  getOrCreateDefaultWorkspace,
  getActiveModel,
  modelContextForPrompt,
} from '../discovery/workspaceService.js';

const MAX_LLM_ROUNDS = Number(process.env.LLM_MAX_ROUNDS || 10);
const MAX_TOOL_CALLS = Number(process.env.LLM_MAX_TOOL_CALLS || 24);

function systemPrompt(trainedModelContext, learning = []) {
  const picosoFallback = semanticContextForPrompt();
  return `You are Intelligence Partner — the company's private ops analytics console for THIS business.
You plan freely. You are NOT a public chatbot with privacy restrictions.

CRITICAL — COMPANY OPS DATA (NOT PUBLIC)
- Full customer names, phones, emails, addresses, and distances are ALLOWED and expected.
- NEVER refuse exports/lists citing privacy, GDPR, PII, or anonymization. This is the business's own data.
- NEVER invent numbers or lists. Always call tools for counts, revenue, ranks, and customer exports.
- NEVER say "I can't provide" when a tool exists. Use tools and answer from tool results only.

SECURITY (only secrets)
- Never reveal API keys, connection strings, passwords, or LLM system secrets.
- Contact fields from tools are OK to show and export.

TOOLS — MANDATORY MAPPING
1. Time phrases (last month, August, yesterday) → get_clock_context first, pass fromDate/toDate/periodLabel.
2. Last month total sales / revenue → calculate_revenue (completed statuses by default).
3. Export / list customers who ordered (names, phones, distances) → export_order_customers (high limit).
4. Customers ordered N+ times → query_customers.
5. Registered users / platform signups / users count → count_registered_users or list_registered_users (users collection).
6. Rankings → top_products.
7. Repeat rate → get_repeat_customers preferred_metric=repeat_rate.
8. Product + km → resolve_product then count_unique_product_buyers.
9. Store location / chat → get_store_info.

After tools, headline with the real number/list count. Never claim privacy. Never claim data is unavailable without calling the tool first.

TRAINED BRAIN (structure map; live answers still use tools)
${JSON.stringify(trainedModelContext, null, 2)}

OPS FALLBACK FACTS
${JSON.stringify(picosoFallback, null, 2)}

CONTINUOUS LEARNING (recent successful episodes — reuse tool patterns when similar)
${JSON.stringify(learning, null, 2)}`;
}

function looksLikePrivacyRefusal(text = '') {
  const t = String(text || '').toLowerCase();
  return (
    /\b(privacy|gdpr|pii|anonymiz|cannot provide|unable to (export|provide|share|give)|violat\w* privacy|raw user data|personal data)\b/i.test(
      t
    ) ||
    /\bi'?m unable to\b.*\b(phone|name|customer|export|users?)\b/i.test(t)
  );
}

/**
 * @param {object} opts
 * @param {string} opts.message
 * @param {string} [opts.conversationId]
 * @param {(event: string, data: object) => void} opts.emit - SSE emitter
 */
export async function runAgent({ message, conversationId, emit = () => {} }) {
  const started = Date.now();
  const runId = `run_${crypto.randomBytes(8).toString('hex')}`;
  let tokenUsage = { input: 0, output: 0 };
  const steps = [];
  const toolCallCount = { n: 0 };

  const workspace = await getOrCreateDefaultWorkspace();
  const activeModel = await getActiveModel(workspace._id);
  const trainedCtx = modelContextForPrompt(activeModel);
  const learning = await loadRecentLearning(workspace._id, 10);
  setToolContext({
    workspaceId: workspace._id,
    model: activeModel,
  });

  const conversation = await getOrCreateConversation(conversationId, workspace._id);
  let runDoc;
  try {
    runDoc = await LlmAgentRun.create({
      runId,
      workspaceId: workspace._id,
      conversationId: conversation._id,
      status: 'RECEIVED',
      userMessage: message,
      steps: [],
    });
  } catch {
    /* persistence optional */
  }

  const setStatus = async (status, detail = {}) => {
    emit('status', { stage: status.toLowerCase(), runId, ...detail });
    if (runDoc) {
      runDoc.status = status;
      runDoc.steps = steps;
      try {
        await runDoc.save();
      } catch {
        /* ignore */
      }
    }
  };

  await setStatus('CLASSIFYING');

  const provider = createLlmProvider();
  const tools = getCohereToolDefs();

  // Assemble messages: system + optional summary + recent history + new user message
  const historyCtx = buildContextMessages(conversation, message);
  const messages = [{ role: 'system', content: systemPrompt(trainedCtx, learning) }];
  for (const m of historyCtx) {
    if (m.role === 'system' && m.content) {
      messages.push({ role: 'system', content: m.content });
    } else if (m.role === 'user' || m.role === 'assistant') {
      messages.push({ role: m.role, content: m.content || '' });
    }
  }

  await setStatus('PLANNING');

  let collectedToolResults = [];
  let lastText = '';
  let clarification = null;
  let productConfidence = null;

  try {
    for (let round = 0; round < MAX_LLM_ROUNDS; round++) {
      const response = await provider.chat({ messages, tools });
      tokenUsage.input += response.usage?.input || 0;
      tokenUsage.output += response.usage?.output || 0;

      if (response.toolCalls?.length) {
        await setStatus('WAITING_FOR_TOOL', {
          tools: response.toolCalls.map((t) => t.name),
        });

        // Push assistant tool-call message (Cohere v2 style)
        const assistantMsg = {
          role: 'assistant',
          tool_calls: response.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments || {}),
            },
          })),
        };
        // Also include content if any
        if (response.text) {
          assistantMsg.content = response.text;
        }
        messages.push(assistantMsg);

        // Fallback: if Cohere expects content array format, also try rawMessage
        if (response.rawMessage && !messages[messages.length - 1].tool_calls) {
          messages[messages.length - 1] = {
            role: 'assistant',
            ...normalizeAssistantForCohere(response.rawMessage, response.toolCalls),
          };
        }

        for (const tc of response.toolCalls) {
          if (toolCallCount.n >= MAX_TOOL_CALLS) {
            throw new Error('Agent execution limit reached (max tool calls)');
          }
          toolCallCount.n += 1;

          emit('status', {
            stage: 'executing',
            tool: tc.name,
            runId,
          });
          await setStatus('EXECUTING', { tool: tc.name });

          const executed = await executeTool(tc.name, tc.arguments);
          steps.push({
            tool: tc.name,
            input: tc.arguments,
            status: executed.status,
            durationMs: executed.durationMs,
          });

          try {
            await LlmToolExecution.create({
              runId,
              tool: tc.name,
              input: tc.arguments,
              output: executed.result,
              durationMs: executed.durationMs,
              status: executed.status === 'success' ? 'success' : 'error',
              error: executed.status === 'error' ? executed.result?.error : null,
            });
          } catch {
            /* ignore */
          }

          if (tc.name === 'resolve_product' && executed.result) {
            productConfidence = executed.result.confidence;
            if (executed.result.needsClarification) {
              clarification = {
                type: 'product',
                message: executed.result.message,
                candidates: executed.result.candidates || [],
              };
            }
          }

          collectedToolResults.push({
            tool: tc.name,
            result: executed.result,
          });

          // tool result message — Cohere v2
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(executed.result),
          });
        }

        if (clarification) {
          await setStatus('NEEDS_CLARIFICATION');
          const answer = buildClarificationAnswer(clarification, productConfidence);
          await appendTurn(conversation, message, answer.headline, answer);
          finishRun(runDoc, {
            status: 'NEEDS_CLARIFICATION',
            result: answer,
            tokenUsage,
            steps,
            started,
          });
          emit('result', answer);
          emit('complete', {
            conversationId: String(conversation._id),
            runId,
            durationMs: Date.now() - started,
          });
          return { conversationId: conversation._id, runId, result: answer };
        }

        continue; // next round with tool results
      }

      // no tool calls — final text answer (greetings / explanations)
      lastText = response.text || '';
      break;
    }

    // Soft complete only if product was resolved but metrics missing
    if (
      collectedToolResults.some((t) => t.tool === 'resolve_product' && t.result?.match) &&
      !hasMetricResult(collectedToolResults)
    ) {
      emit('status', { stage: 'completing_tools', runId });
      await setStatus('EXECUTING', { tool: 'auto_complete' });
      const completed = await completeMissingTools({
        message,
        collectedToolResults,
        productConfidence,
        emit,
        runId,
        steps,
      });
      collectedToolResults = completed.toolResults;
      productConfidence = completed.productConfidence ?? productConfidence;
      if (completed.needsClarification) {
        const resolveResult = collectedToolResults.find(
          (t) => t.tool === 'resolve_product'
        )?.result;
        const answer = buildClarificationAnswer(
          {
            type: 'product',
            message: resolveResult?.message || 'Which product do you mean?',
            candidates: resolveResult?.candidates || [],
          },
          productConfidence
        );
        await setStatus('NEEDS_CLARIFICATION');
        await appendTurn(conversation, message, answer.headline, answer);
        finishRun(runDoc, {
          status: 'NEEDS_CLARIFICATION',
          result: answer,
          tokenUsage,
          steps,
          started,
        });
        emit('result', answer);
        emit('complete', {
          conversationId: String(conversation._id),
          runId,
          durationMs: Date.now() - started,
        });
        return { conversationId: conversation._id, runId, result: answer };
      }
    }

    await setStatus('VALIDATING');
    let answer = buildStructuredAnswer({
      text: lastText,
      toolResults: collectedToolResults,
      productConfidence,
      userMessage: message,
    });

    // Pure chat path — only if NOT analytics and NOT a privacy refusal hallucination
    if (!hasMetricResult(collectedToolResults) && lastText && !isUsefulAnswer(answer)) {
      if (
        !isAnalyticsIntent(message) &&
        !looksLikePrivacyRefusal(lastText) &&
        !/\b(export|list|phone|registered|signup)\b/i.test(message)
      ) {
        answer = {
          kind: 'chat',
          headline: lastText.slice(0, 400),
          narrative: lastText,
          explanation: lastText,
          metrics: [],
          definitions: [],
          calculationSteps: ['LLM direct response (no analytics tools)'],
          sources: [],
          dimensions: {},
          confidence: { overall: 0.85 },
          clarification: null,
          freshness: 'live',
          period: null,
        };
      } else if (looksLikePrivacyRefusal(lastText)) {
        // Drop refusal text — recovery tools will run for analytics intents
        answer = {
          headline: 'Running live data query…',
          metrics: [],
          confidence: { overall: 0.1 },
          incomplete: true,
        };
      }
    }

    // Recovery for analytics / export / registered-users still empty
    if (
      !isUsefulAnswer(answer) &&
      (isAnalyticsIntent(message) ||
        /\b(export|list|phone|registered|signup|platform users?)\b/i.test(message) ||
        looksLikePrivacyRefusal(lastText))
    ) {
      emit('status', { stage: 'recovery_tools', runId });
      answer = await runDeterministicFallback(message, emit);
    }

    const validation = validateMetricResult(answer);
    if (!validation.ok) {
      answer.warnings = validation.issues;
    }

    if (!isUsefulAnswer(answer)) {
      await setStatus('FAILED');
      finishRun(runDoc, {
        status: 'FAILED',
        result: answer,
        tokenUsage,
        steps,
        started,
        errors: ['incomplete_answer'],
      });
      return {
        conversationId: conversation._id,
        runId,
        result: answer,
        incomplete: true,
      };
    }

    await setStatus('ANSWERING');
    await appendTurn(conversation, message, answer.headline || lastText, answer);
    await learnEpisode({
      workspaceId: workspace._id,
      conversationId: conversation._id,
      userMessage: message,
      answer,
      toolsUsed: collectedToolResults.map((t) => t.tool).filter(Boolean),
    });

    finishRun(runDoc, {
      status: 'COMPLETED',
      result: answer,
      tokenUsage,
      steps,
      started,
    });

    emit('result', answer);
    emit('complete', {
      conversationId: String(conversation._id),
      runId,
      durationMs: Date.now() - started,
      tokenUsage,
    });

    return { conversationId: conversation._id, runId, result: answer };
  } catch (err) {
    const errorAnswer = {
      headline: 'Something went wrong',
      error: err.message || 'Agent failed',
      metrics: [],
      definitions: [],
      calculationSteps: [],
      confidence: { overall: 0 },
      clarification: null,
      freshness: 'live',
    };
    await setStatus('FAILED', { error: err.message });
    finishRun(runDoc, {
      status: 'FAILED',
      result: errorAnswer,
      tokenUsage,
      steps,
      started,
      errors: [err.message],
    });
    emit('error', { message: err.message, runId });
    // Always emit a result event so the UI never hangs on "No result returned".
    emit('result', errorAnswer);
    emit('complete', {
      conversationId: String(conversation._id),
      runId,
      durationMs: Date.now() - started,
      failed: true,
    });
    return {
      conversationId: conversation._id,
      runId,
      result: errorAnswer,
      error: err,
      incomplete: true,
    };
  } finally {
    clearToolContext();
  }
}

function normalizeAssistantForCohere(rawMessage, toolCalls) {
  if (rawMessage?.tool_calls || rawMessage?.content) {
    return {
      content: rawMessage.content,
      tool_calls: rawMessage.tool_calls,
    };
  }
  return {
    tool_calls: toolCalls.map((tc) => ({
      id: tc.id,
      type: 'function',
      function: {
        name: tc.name,
        arguments: JSON.stringify(tc.arguments || {}),
      },
    })),
  };
}

function finishRun(runDoc, { status, result, tokenUsage, steps, started, errors = [] }) {
  if (!runDoc) return;
  runDoc.status = status;
  runDoc.result = result;
  runDoc.tokenUsage = tokenUsage;
  runDoc.steps = steps;
  runDoc.durationMs = Date.now() - started;
  runDoc.errorList = errors;
  runDoc.completedAt = new Date();
  runDoc.save().catch(() => {});
}

function buildClarificationAnswer(clarification, productConfidence) {
  return {
    headline: clarification.message || 'Please clarify',
    metrics: [],
    definitions: [],
    calculationSteps: ['Product resolution needs clarification'],
    confidence: {
      product: productConfidence ?? 0,
      overall: productConfidence ?? 0,
    },
    clarification: {
      type: clarification.type,
      candidates: clarification.candidates || [],
    },
    freshness: 'live',
    period: null,
  };
}

function hasMetricResult(toolResults = []) {
  return toolResults.some(
    (t) =>
      t?.result?.type === 'metric_result' ||
      t?.result?.type === 'list_result' ||
      (typeof t?.result?.value === 'number' && t?.result?.metric)
  );
}

export function isUsefulAnswer(answer) {
  if (!answer) return false;
  if (answer.incomplete) return false;
  const blob = `${answer.headline || ''} ${answer.narrative || ''} ${answer.explanation || ''}`;
  if (looksLikePrivacyRefusal(blob)) return false;
  if (answer.kind === 'greeting') return true;
  if (answer.customers?.length > 0) return true;
  if (answer.kind === 'chat' && (answer.headline || answer.narrative)?.length > 8) {
    // Chat is only useful if it's not a refusal disguised as help
    if (looksLikePrivacyRefusal(answer.headline || answer.narrative || '')) return false;
    return true;
  }
  if (answer.clarification?.candidates?.length) return true;
  if (answer.error === 'fallback_no_match') return false;
  if (answer.products?.length > 0) return true;
  if (answer.metrics?.length > 0) return true;
  if (answer.primaryMetric != null) return true;
  const h = String(answer.headline || '').toLowerCase();
  if (
    h.includes('analysis complete') ||
    h.includes('could not interpret') ||
    h.includes('no metrics returned') ||
    h.includes('no metric query ran') ||
    h.includes('could not map that') ||
    h.includes('try again') ||
    h.includes('running live data')
  ) {
    return false;
  }
  if (answer.headline && answer.headline.length > 12) return true;
  return false;
}

/**
 * After resolve_product (or empty tools), run analytics tools in code.
 * This is the guarantee path — never depend on the LLM finishing alone.
 */
async function completeMissingTools({
  message,
  collectedToolResults,
  productConfidence,
  emit,
  runId,
  steps,
}) {
  const toolResults = [...(collectedToolResults || [])];
  let confidence = productConfidence;

  let productId = null;
  let productName = null;
  for (const t of toolResults) {
    if (t.tool === 'resolve_product' && t.result?.match) {
      productId = t.result.match.productId;
      productName = t.result.match.name;
      confidence = t.result.confidence ?? confidence;
    }
    if (t.tool === 'resolve_product' && t.result?.needsClarification) {
      return {
        toolResults,
        productConfidence: t.result.confidence ?? confidence,
        needsClarification: true,
      };
    }
  }

  const radiusKm = extractRadiusKm(message);
  const days = extractDays(message);
  const range = extractDateRange(message);
  const tmpl = matchTemplate(message);

  // Resolve product if still missing
  if (!productId && !productName) {
    const name = tmpl?.productQuery || extractProductName(message);
    if (name) {
      emit('status', { stage: 'resolving_product', runId });
      const resolved = await executeTool('resolve_product', { name });
      steps.push({
        tool: 'resolve_product',
        input: { name },
        status: resolved.status,
        durationMs: resolved.durationMs,
      });
      toolResults.push({ tool: 'resolve_product', result: resolved.result });
      if (resolved.result?.needsClarification) {
        return {
          toolResults,
          productConfidence: resolved.result.confidence,
          needsClarification: true,
        };
      }
      if (resolved.result?.match) {
        productId = resolved.result.match.productId;
        productName = resolved.result.match.name;
        confidence = resolved.result.confidence;
      }
    }
  }

  // Already have metric_result → done
  if (hasMetricResult(toolResults)) {
    return { toolResults, productConfidence: confidence };
  }

  const dateArgs = {
    days: range.days,
    fromDate: range.fromDate,
    toDate: range.toDate,
    periodLabel: range.label,
  };

  // Core analytics completion
  if (productId || productName) {
    emit('status', {
      stage: 'executing',
      tool: 'count_unique_product_buyers',
      runId,
    });
    const buyers = await executeTool('count_unique_product_buyers', {
      product_id: productId || undefined,
      product_name: productName || undefined,
      radius_km: radiusKm ?? tmpl?.args?.radius_km ?? undefined,
      ...dateArgs,
      ...(tmpl?.args || {}),
      limit: 20,
    });
    steps.push({
      tool: 'count_unique_product_buyers',
      input: {
        product_id: productId,
        product_name: productName,
        radius_km: radiusKm,
        ...dateArgs,
      },
      status: buyers.status,
      durationMs: buyers.durationMs,
    });
    toolResults.push({ tool: 'count_unique_product_buyers', result: buyers.result });
    return { toolResults, productConfidence: confidence };
  }

  // Non-product templates
  if (tmpl?.id && tmpl.id !== 'product_buyers') {
    const toolName = tmpl.id;
    const r = await executeTool(toolName, { ...dateArgs, ...(tmpl.args || {}) });
    steps.push({
      tool: toolName,
      input: tmpl.args,
      status: r.status,
      durationMs: r.durationMs,
    });
    toolResults.push({ tool: toolName, result: r.result });
  }

  return { toolResults, productConfidence: confidence };
}

function extractProductName(message) {
  return extractProductQuery(message) || matchTemplate(message)?.productQuery || null;
}

export function greetingAnswer() {
  return {
    kind: 'greeting',
    headline: 'Hi — ask me anything about Picoso customers, products, revenue, or geo.',
    narrative:
      'Examples:\n• 2 km ke andar Paneer Tikka Rice kitne customers ne order kiya?\n• Last 30 din ka revenue kitna tha?\n• What products sell the most?\n• Inactive customers for 60 days',
    metrics: [],
    definitions: [],
    calculationSteps: [],
    confidence: { overall: 1 },
    clarification: null,
    freshness: 'live',
    period: null,
  };
}

function buildStructuredAnswer({ text, toolResults, productConfidence, userMessage }) {
  const metrics = [];
  const calculationSteps = [];
  const definitions = [];
  const sources = [];
  let customers = [];
  let products = [];
  let filters = {};
  let notes = [];
  let toolErrors = [];
  let preferredMetricId = null;
  let relatedLabels = {};
  const llmText = (text || '').trim();
  const statusHint = userMessage ? extractStatusFilter(userMessage) : null;

  for (const { tool, result } of toolResults || []) {
    if (!result) continue;
    calculationSteps.push(`Ran tool: ${tool}`);

    if (result.type === 'error') {
      toolErrors.push(`${tool}: ${result.error || 'failed'}`);
      calculationSteps.push(`⚠ ${tool} failed: ${result.error || 'error'}`);
      continue;
    }

    if (tool === 'resolve_product' && result.match) {
      calculationSteps.push(
        `Resolved product → ${result.match.name} (match ${Math.round((result.confidence || 0) * 100)}%)`
      );
      filters.product = result.match.name;
      filters.productId = result.match.productId;
      sources.push({
        kind: 'catalog',
        name: 'bowls',
        detail: `Matched product ${result.match.name} (_id ${result.match.productId})`,
      });
    }

    if (result.type === 'metric_result') {
      preferredMetricId =
        result.preferMetric || result.preferred_metric || result.metric || preferredMetricId;
      metrics.push({
        id: result.metric,
        label: labelForMetric(result.metric, result.filters?.statusLabel),
        value: result.value ?? 0,
        unit: result.unit,
      });
      if (result.related) {
        for (const [k, v] of Object.entries(result.related)) {
          if (typeof v === 'number') {
            const custom =
              result.relatedLabels?.[k] || relatedLabels[k];
            metrics.push({
              id: k,
              label: custom || labelForMetric(k, result.filters?.statusLabel),
              value: v,
              unit: unitFor(k),
            });
          }
        }
      }
      if (result.relatedLabels) {
        relatedLabels = { ...relatedLabels, ...result.relatedLabels };
      }
      if (result.filters) filters = { ...filters, ...result.filters };
      if (result.customers) {
        customers = result.customers.map((c) => sanitizeCustomerRow(c));
      }
      if (result.definitions) {
        for (const [k, v] of Object.entries(result.definitions)) {
          definitions.push({ id: k, text: v });
        }
      }
      if (result.definition) {
        definitions.push({ id: result.metric, text: result.definition });
      }
      if (result.notes) notes.push(result.notes);
      if (result.calculationNote) calculationSteps.push(result.calculationNote);

      if (result.source) {
        sources.push({
          kind: 'mongo',
          name: result.source.collection || result.source.dataset || 'orders',
          freshness: result.source.freshness || 'live',
          detail: result.source.match
            ? `status ∈ [${(result.source.match.status || []).join(', ')}]`
            : 'live aggregation',
        });
      }

      if (result.filters?.radiusKm != null) {
        calculationSteps.push(
          `Radius ${result.filters.radiusKm} km from store ${STORE_LOCATION.lat}, ${STORE_LOCATION.lng} (haversine on deliveryAddress / profile)`
        );
      }
      if (result.filters?.statusLabel) {
        calculationSteps.push(`Status dimension: ${result.filters.statusLabel}`);
      } else if (result.filters?.statuses?.length) {
        calculationSteps.push(`Status ∈ ${result.filters.statuses.join(', ')}`);
      }
      if (result.filters?.periodLabel) {
        calculationSteps.push(`Period: ${result.filters.periodLabel}`);
      } else if (result.filters?.days) {
        calculationSteps.push(`Period: last ${result.filters.days} days`);
      }
      if (result.metric === 'unique_customers') {
        calculationSteps.push(`Counted ${result.value ?? 0} unique customers (userId)`);
      }
      if (result.related?.repeat_customers != null) {
        calculationSteps.push(
          `Repeat customers (2+ completed product orders): ${result.related.repeat_customers}`
        );
      }
    }

    if (result.type === 'list_result' && result.products) {
      preferredMetricId = preferredMetricId || 'top_products';
      products = result.products;
      if (result.filters) filters = { ...filters, ...result.filters };
      calculationSteps.push(`Ranked top ${result.products.length} products on live items`);
      sources.push({
        kind: 'mongo',
        name: 'orders.items',
        freshness: 'live',
        detail: 'Top products by units',
      });
    }
  }

  const seen = new Set();
  const deduped = [];
  for (const m of metrics) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    deduped.push(m);
  }

  const primary =
    (preferredMetricId && deduped.find((m) => m.id === preferredMetricId)) ||
    deduped.find((m) => m.id === 'export_customers') ||
    deduped.find((m) => m.id === 'registered_users') ||
    deduped.find((m) => m.id === 'repeat_rate') ||
    deduped.find((m) => m.id === 'unique_customers') ||
    deduped.find((m) => m.id === 'orders') ||
    deduped.find((m) => m.id === 'revenue') ||
    deduped.find((m) => m.id === 'segment_customers') ||
    deduped.find((m) => m.id === 'cancelled_order_value') ||
    deduped.find((m) => m.id === 'repeat_customers') ||
    deduped.find((m) => m.id === 'inactive_customers') ||
    deduped[0];

  let headline;
  if (primary) {
    headline = formatHeadline(primary);
  } else if (products.length) {
    headline = `Top ${products.length} products`;
  } else if (toolErrors.length) {
    headline = `Query failed: ${toolErrors[0]}`;
  } else if (llmText && !/^analysis complete\.?$/i.test(llmText)) {
    headline = llmText;
  } else if (filters.product) {
    headline = `Could not load metrics for “${filters.product}”.`;
  } else {
    headline = 'No metrics returned for this question.';
  }

  for (const m of deduped) {
    if (m.id === 'repeat_rate' && typeof m.value === 'number' && m.value <= 1) {
      m.display = `${(m.value * 100).toFixed(1)}%`;
    }
  }

  const hasData = deduped.length > 0 || products.length > 0;
  const overall = hasData
    ? productConfidence != null
      ? Math.min(0.99, 0.75 + productConfidence * 0.24)
      : 0.92
    : productConfidence != null
      ? Math.min(0.45, productConfidence * 0.4)
      : 0.15;

  if (primary?.id === 'unique_customers' && deduped.some((m) => m.id === 'repeat_customers')) {
    const rep = deduped.find((m) => m.id === 'repeat_customers');
    const rate = deduped.find((m) => m.id === 'repeat_rate');
    const rateText =
      rate != null
        ? rate.display ||
          (rate.value <= 1 ? `${(rate.value * 100).toFixed(1)}%` : String(rate.value))
        : null;
    headline = `${formatHeadline(primary)}`;
    if (rep) {
      headline += ` · ${rep.value} repeat`;
      if (rateText) headline += ` (${rateText})`;
    }
  }

  // Dimensions used in the query
  const dimensions = {
    metric: primary?.id || null,
    status: filters.statusLabel || statusHint?.label || null,
    statuses: filters.statuses || statusHint?.statuses || null,
    product: filters.product || filters.productName || null,
    productId: filters.productId || null,
    radius_km: filters.radiusKm ?? null,
    period: filters.periodLabel || (filters.days != null ? `Last ${filters.days} days` : null),
    fromDate: filters.fromDate || null,
    toDate: filters.toDate || null,
    currency: 'INR',
    store_origin:
      filters.radiusKm != null
        ? { lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng }
        : null,
    dataset: 'live MongoDB · orders',
  };

  // Short human explanation of what we measured
  const explanation = buildExplanation({
    primary,
    filters,
    dimensions,
    productConfidence,
    customers,
    products,
    userMessage,
  });

  let narrative = notes.length ? notes.join(' ') : null;
  if (!narrative) narrative = explanation;
  else narrative = `${explanation}\n${narrative}`;

  if (llmText && primary && !llmText.includes(String(primary.value))) {
    // ignore pure "Analysis complete"
    if (!/^analysis complete\.?$/i.test(llmText)) {
      narrative = [narrative, llmText].filter(Boolean).join('\n');
    }
  }

  // Dedup sources
  const srcSeen = new Set();
  const dedupeSources = [];
  for (const s of sources) {
    const k = `${s.kind}|${s.name}|${s.detail}`;
    if (srcSeen.has(k)) continue;
    srcSeen.add(k);
    dedupeSources.push(s);
  }
  if (!dedupeSources.length && hasData) {
    dedupeSources.push({
      kind: 'mongo',
      name: 'orders',
      freshness: 'live',
      detail: 'Live aggregation on app MongoDB',
    });
  }

  return {
    headline: String(headline).slice(0, 2000),
    explanation,
    metrics: deduped,
    primaryMetric: primary || null,
    definitions,
    calculationSteps: uniqueSteps(calculationSteps),
    sources: dedupeSources,
    dimensions,
    customers: customers.slice(0, 500),
    products: products.slice(0, 500),
    export: {
      formats: ['csv', 'json'],
      customerCount: Math.min(customers.length, 500),
      productCount: Math.min(products.length, 500),
      generatedAt: new Date().toISOString(),
    },
    filters,
    toolErrors: toolErrors.length ? toolErrors : undefined,
    confidence: {
      product: productConfidence ?? null,
      overall,
    },
    clarification: null,
    freshness: 'live',
    period:
      filters.periodLabel ||
      (filters.days != null ? `Last ${filters.days} days` : null) ||
      (hasData ? 'Last 90 days (default)' : null),
    narrative,
  };
}

function buildExplanation({ primary, filters, dimensions, productConfidence, customers, userMessage }) {
  const bits = [];
  if (dimensions.product) {
    bits.push(
      `Measured live buyers of “${dimensions.product}”` +
        (dimensions.radius_km != null ? ` inside ${dimensions.radius_km} km of the store` : '') +
        '.'
    );
  } else if (primary?.id === 'orders') {
    bits.push(
      `Counted live orders with status “${dimensions.status || 'completed (non-cancelled)'}”.`
    );
  } else if (primary?.id === 'revenue' || primary?.id === 'cancelled_order_value') {
    bits.push(`Summed totalPrice on live orders (${dimensions.status || 'completed'}).`);
  } else if (primary) {
    bits.push(`Computed ${labelForMetric(primary.id)} from live Mongo orders.`);
  } else {
    bits.push('No live metric rows returned for this question.');
  }

  if (dimensions.period) bits.push(`Window: ${dimensions.period}.`);
  if (filters.statusLabel || dimensions.statuses) {
    bits.push(
      `Status filter is required for cancelled vs delivered — they are separate Mongo status values.`
    );
  }
  if (productConfidence != null && dimensions.product) {
    bits.push(`Product match confidence ${Math.round(productConfidence * 100)}%.`);
  }
  if (customers?.length) {
    bits.push(
      `Showing ${customers.length} customer rows with full contact details (exportable from the studio).`
    );
  }
  if (userMessage && /repeat/i.test(userMessage) && dimensions.product) {
    bits.push('Repeat = 2+ completed product orders for that buyer in the window.');
  }
  bits.push('Training paste is structure-only; this number is from live data.');
  return bits.join(' ');
}

function uniqueSteps(steps) {
  const out = [];
  for (const s of steps) {
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

function labelForMetric(id, statusLabel) {
  const map = {
    unique_customers: 'Unique customers',
    orders: statusLabel ? `Orders (${statusLabel})` : 'Orders',
    revenue: 'Revenue',
    cancelled_order_value: 'Cancelled order value (nominal)',
    aov: 'AOV',
    repeat_customers: 'Repeat customers',
    repeat_rate: 'Repeat rate',
    inactive_customers: 'Inactive customers',
    segment_customers: 'Customers in segment',
    export_customers: 'Customers (export list)',
    registered_users: 'Registered users',
    rows_returned: 'Rows returned',
    total_unique: 'Unique in window',
    min_orders: 'Min orders filter',
    total_product_buyers_any_distance: 'Buyers (any distance)',
    buyers_with_coordinates: 'Buyers with location data',
  };
  return map[id] || String(id || '').replace(/_/g, ' ');
}

function unitFor(id) {
  if (id === 'revenue' || id === 'aov' || id === 'spend' || id === 'cancelled_order_value') {
    return 'INR';
  }
  if (id === 'repeat_rate') return 'ratio';
  if (id === 'orders' || String(id).includes('orders')) return 'orders';
  return 'count';
}

function formatHeadline(metric) {
  if (!metric) return 'Done';
  if (
    metric.id === 'revenue' ||
    metric.id === 'aov' ||
    metric.id === 'cancelled_order_value'
  ) {
    return `₹${Number(metric.value).toLocaleString('en-IN')}`;
  }
  if (metric.id === 'repeat_rate') {
    const pct = metric.value <= 1 ? (metric.value * 100).toFixed(1) : metric.value;
    return `${pct}% repeat rate`;
  }
  const unit =
    metric.unit === 'orders'
      ? 'orders'
      : metric.unit === 'customers'
        ? 'customers'
        : metric.unit || '';
  return `${Number(metric.value).toLocaleString('en-IN')} ${unit}`.trim();
}

/**
 * Recovery tools engine (secondary). AI is primary; this only helps when LLM is down or incomplete.
 * Intentionally flexible tool calls, not a fixed FAQ only.
 */
export async function runDeterministicFallback(message, emit = () => {}) {
  emit('status', { stage: 'understanding', mode: 'recovery_tools' });

  const lower = String(message || '').toLowerCase();
  const range = extractDateRange(message);
  const dateArgs = {
    days: range.days,
    fromDate: range.fromDate,
    toDate: range.toDate,
    periodLabel: range.label,
  };
  const status = extractStatusFilter(message);

  // Last calendar month (when extractDateRange already set) + clock for named months / last month
  const monthMatch = lower.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i
  );
  const wantsLastMonth = /\blast\s*month\b|\bprevious\s*month\b|\bllast\s*month\b/i.test(lower);
  if (monthMatch || wantsLastMonth) {
    const clock = await executeTool('get_clock_context', {});
    if (wantsLastMonth && clock.result?.windows?.last_month) {
      const win = clock.result.windows.last_month;
      dateArgs.fromDate = win.fromDate;
      dateArgs.toDate = win.toDate;
      dateArgs.periodLabel = win.periodLabel || 'Last calendar month';
      dateArgs.days = null;
    } else if (monthMatch) {
      const key = monthMatch[1].toLowerCase();
      const win = clock.result?.windows?.months?.[key];
      if (win) {
        dateArgs.fromDate = win.fromDate;
        dateArgs.toDate = win.toDate;
        dateArgs.periodLabel = win.periodLabel;
        dateArgs.days = null;
      }
    }
  }

  // Registered users / platform signups
  if (
    /\b(registered|signup|sign[- ]?up|platform users?|users? on (the )?platform|total users?|all users?)\b/i.test(
      lower
    ) &&
    !/\bordered?\b/i.test(lower)
  ) {
    emit('status', { stage: 'querying', tool: 'count_registered_users' });
    const listWanted = /\b(list|export|show|names?|phones?)\b/i.test(lower);
    const tools = [];
    const countR = await executeTool('count_registered_users', {});
    tools.push({ tool: 'count_registered_users', result: countR.result });
    if (listWanted) {
      const listR = await executeTool('list_registered_users', { limit: 200 });
      tools.push({ tool: 'list_registered_users', result: listR.result });
    }
    return buildStructuredAnswer({
      text: '',
      toolResults: tools,
      productConfidence: null,
      userMessage: message,
    });
  }

  // Export / list customers who ordered (phones, distances)
  if (
    /\b(export|list|download|csv)\b/i.test(lower) ||
    (/\b(customers?|users?)\b/i.test(lower) &&
      /\b(phone|distance|ordered|order)\b/i.test(lower))
  ) {
    emit('status', { stage: 'querying', tool: 'export_order_customers' });
    const r = await executeTool('export_order_customers', {
      ...dateArgs,
      statuses: status.statuses,
      limit: 300,
      include_distance: true,
    });
    return buildStructuredAnswer({
      text: '',
      toolResults: [{ tool: 'export_order_customers', result: r.result }],
      productConfidence: null,
      userMessage: message,
    });
  }

  // Rank items
  if (/\b(rank|top|best.?sell|most sold|items?\s+sold|bestsellers?)\b/i.test(message)) {
    emit('status', { stage: 'querying', tool: 'top_products' });
    const r = await executeTool('top_products', { ...dateArgs, limit: 40 });
    return buildStructuredAnswer({
      text: '',
      toolResults: [
        { tool: 'get_clock_context', result: { type: 'clock', used: Boolean(monthMatch) } },
        { tool: 'top_products', result: r.result },
      ],
      productConfidence: null,
      userMessage: message,
    });
  }

  // Customers ordered more than N times
  const moreThan = lower.match(
    /(?:more than|over|>\s*|greater than)\s*(\d+)\s*(?:times|orders?)/i
  );
  const atLeast = lower.match(
    /(?:at least|>=\s*|minimum of)\s*(\d+)\s*(?:times|orders?)/i
  );
  if (moreThan || atLeast || /\bcustomers?\b.*\b(order|times)\b/i.test(lower)) {
    let minOrders = 2;
    if (moreThan) minOrders = Number(moreThan[1]) + 1;
    else if (atLeast) minOrders = Number(atLeast[1]);
    else {
      const n = lower.match(/(\d+)\s*(?:times|orders?)/);
      if (n) minOrders = Number(n[1]);
    }
    emit('status', { stage: 'querying', tool: 'query_customers' });
    const r = await executeTool('query_customers', {
      ...dateArgs,
      min_orders: minOrders,
      statuses: status.statuses,
      limit: 100,
    });
    return buildStructuredAnswer({
      text: '',
      toolResults: [{ tool: 'query_customers', result: r.result }],
      productConfidence: null,
      userMessage: message,
    });
  }

  // Repeat rate explicitly
  if (/\brepeat\s*rate\b/i.test(message)) {
    const r = await executeTool('get_repeat_customers', {
      ...dateArgs,
      preferred_metric: 'repeat_rate',
      min_orders: 2,
    });
    return buildStructuredAnswer({
      text: '',
      toolResults: [{ tool: 'get_repeat_customers', result: r.result }],
      productConfidence: null,
      userMessage: message,
    });
  }

  const tmpl = matchTemplate(message);
  const radiusKm = extractRadiusKm(message);

  if (tmpl?.id === 'count_orders') {
    const r = await executeTool('count_orders', {
      ...dateArgs,
      ...(tmpl.args || {}),
      statuses: tmpl.args?.statuses || status.statuses,
      statusLabel: tmpl.args?.statusLabel || status.label,
    });
    return buildStructuredAnswer({
      text: '',
      toolResults: [{ tool: 'count_orders', result: r.result }],
      productConfidence: null,
      userMessage: message,
    });
  }

  const earlyTools = [
    'inactive_customers',
    'top_products',
    'calculate_revenue',
    'get_aov',
    'get_repeat_customers',
    'find_customers_within_radius',
  ];
  if (tmpl?.id && earlyTools.includes(tmpl.id)) {
    const r = await executeTool(tmpl.id, { ...dateArgs, ...(tmpl.args || {}) });
    return buildStructuredAnswer({
      text: '',
      toolResults: [{ tool: tmpl.id, result: r.result }],
      productConfidence: null,
      userMessage: message,
    });
  }

  if (tmpl?.id === 'product_buyers' || tmpl?.productQuery) {
    const productQuery = tmpl?.productQuery || extractProductQuery(message);
    if (productQuery) {
      const resolved = await executeTool('resolve_product', { name: productQuery });
      if (resolved.result?.needsClarification) {
        return buildClarificationAnswer(
          {
            type: 'product',
            message: resolved.result.message,
            candidates: resolved.result.candidates,
          },
          resolved.result.confidence
        );
      }
      if (resolved.result?.match) {
        const match = resolved.result.match;
        const buyers = await executeTool('count_unique_product_buyers', {
          product_id: match.productId,
          product_name: match.name,
          radius_km: radiusKm ?? tmpl?.args?.radius_km ?? undefined,
          ...dateArgs,
          limit: 20,
        });
        return buildStructuredAnswer({
          text: '',
          toolResults: [
            { tool: 'resolve_product', result: resolved.result },
            { tool: 'count_unique_product_buyers', result: buyers.result },
          ],
          productConfidence: resolved.result.confidence,
          userMessage: message,
        });
      }
    }
  }

  // Last month sales fallback
  if (/\b(sales|revenue|total)\b/i.test(lower) && /\b(month|yesterday|today|week)\b/i.test(lower)) {
    const r = await executeTool('calculate_revenue', {
      ...dateArgs,
      statuses: status.statuses,
      statusLabel: status.label,
    });
    return buildStructuredAnswer({
      text: '',
      toolResults: [{ tool: 'calculate_revenue', result: r.result }],
      productConfidence: null,
      userMessage: message,
    });
  }

  return {
    kind: 'chat',
    headline:
      'I could not finish that request. Try: last month sales, list customers who ordered last month with phones, or customers registered on platform.',
    metrics: [],
    definitions: [],
    calculationSteps: [],
    sources: [],
    dimensions: {},
    explanation:
      'Tools path did not match. Rephrase with a date range, “export customers”, or “registered users”.',
    confidence: { overall: 0.15 },
    clarification: null,
    freshness: 'live',
    error: 'fallback_no_match',
    period: null,
  };
}
