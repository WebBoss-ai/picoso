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
  isGreeting,
  conversationalAnswer,
} from '../templates.js';
import { STORE_LOCATION } from '../semantic/picosoModel.js';
import {
  getOrCreateDefaultWorkspace,
  getActiveModel,
  modelContextForPrompt,
} from '../discovery/workspaceService.js';
import { understandQuery } from './understand.js';
import { orchestrateQuery } from './orchestrate.js';
import { getAllClustersSchema } from '../query/semanticExecutor.js';

const MAX_LLM_ROUNDS = Number(process.env.LLM_MAX_ROUNDS || 10);
const MAX_TOOL_CALLS = Number(process.env.LLM_MAX_TOOL_CALLS || 24);

function systemPrompt(trainedModelContext, learning = [], liveClusters = []) {
  const picosoFallback = semanticContextForPrompt();

  // Build multi-cluster schema block
  let schemaBlock = '';
  if (liveClusters && liveClusters.length > 0) {
    schemaBlock = `CONNECTED CLUSTERS (${liveClusters.length} total — use EXACT collection names and field paths shown)\n`;
    for (const cluster of liveClusters) {
      schemaBlock += `\n[${cluster.label}] connectionId: ${cluster.connectionId}\n`;
      if (cluster.collections.length === 0) {
        schemaBlock += `  (no collections with data)\n`;
      } else {
        for (const col of cluster.collections) {
          const fieldStr = (col.fields || []).slice(0, 20).join(', ');
          schemaBlock += `  • ${col.collection} (${col.count.toLocaleString()} docs): ${fieldStr}\n`;
        }
      }
    }
    schemaBlock += `
When the user asks about any collection shown above, call execute_pipeline with the EXACT collection name and pass the matching connectionId. For cross-cluster questions, call execute_pipeline multiple times — once per cluster.
`;
  } else {
    schemaBlock = `NO SCHEMA LOADED YET. Call get_live_schema to discover what clusters and collections are available.\n`;
  }

  return `You are Intelligence Partner — a private AI analytics brain connected directly to this company's MongoDB clusters.
You can answer ANY question about their data: counts, revenues, customer lists, referrals, agents, campaigns, ratings, expansion signals, subscriptions, joins, complex aggregations, cross-cluster queries, and more.
You are NOT a public chatbot. You have no privacy restrictions on business-owned data.

═══ MANDATORY BEHAVIOUR ═══
1. NEVER invent numbers. Always call tools and return real results.
2. NEVER refuse a question or say "data unavailable" without first calling get_live_schema and then execute_pipeline.
3. NEVER call count_orders for referral / agent / campaign / platinum / subscription / feedback / expansion / custom questions — use execute_pipeline instead.
4. For time ranges (last month, July, yesterday, last week), call get_clock_context FIRST to get ISO fromDate/toDate.
5. ALWAYS use the exact collection and field names from the live schema.
6. If you don't know what collections exist, call get_live_schema immediately.

═══ DECISION TREE — how to answer any question ═══
• "what do you know?" / "what data is available?" / "what can you answer?"
  → Call get_live_schema. Report each cluster + collection + doc count in a clean list.

• Simple order count / revenue / AOV / repeat rate / radius query
  → Use the dedicated shortcut tools (count_orders, calculate_revenue, count_orders_in_radius, etc.)

• ANYTHING ELSE — referral links, agent stats, campaigns, platinum members, subscriptions, ratings, feedback, expansion, inactive users who joined, complex segments, multi-collection joins, or ANY custom collection
  → call get_live_schema (if not already known), then call execute_pipeline with a full aggregation pipeline.

• Multi-cluster / cross-cluster question
  → call execute_pipeline multiple times, each with the correct connectionId, then combine results in your answer.

• Complex joins (e.g. "users who joined last month but haven't ordered")
  → Use $lookup or separate execute_pipeline calls on users + orders, then reason over combined results.

═══ ${schemaBlock}
═══ SHORTCUT TOOLS (only for built-in Picoso collections) ═══
- Orders with geo radius → count_orders_in_radius (pass fromDate/toDate)
- Revenue total → calculate_revenue
- Top products → top_products
- Repeat customers → get_repeat_customers
- Customer export/list → export_order_customers
- Inactive customers → inactive_customers
- Registered user count → count_registered_users or list_registered_users
- Product fuzzy match → resolve_product then count_unique_product_buyers

═══ EXAMPLE PIPELINES ═══
"How many referral links are there?"
→ execute_pipeline({ collection: "friendreferrals", pipeline: [{"$count":"total"}] })

"Users who joined last month but never ordered"
→ get_clock_context for last month dates
→ execute_pipeline on users: [{"$match":{"createdAt":{"$gte":"<from>","$lte":"<to>"}}},{"$lookup":{"from":"orders","localField":"_id","foreignField":"userId","as":"orders"}},{"$match":{"orders":{"$size":0}}},{"$count":"count"}]

"Average rating this week"
→ execute_pipeline({ collection: "feedbacks", pipeline: [{"$match":{"createdAt":{"$gte":"..."}}},{"$group":{"_id":null,"avg":{"$avg":"$rating"}}}] })

═══ TRAINED BRAIN ═══
${JSON.stringify(trainedModelContext, null, 2)}

═══ OPS FALLBACK FACTS ═══
${JSON.stringify(picosoFallback, null, 2)}

═══ RECENT SUCCESSFUL PATTERNS ═══
${JSON.stringify(learning, null, 2)}`;
}

// Maps detected metric to the most likely collection names (hint for LLM)
const METRIC_COLLECTION_HINTS = {
  referral_stats:     ['friendreferrals', 'friendreferralrequests'],
  agent_stats:        ['agents', 'agentleads', 'agentcommissions'],
  campaign_stats:     ['campaigns', 'campaignleads', 'campaignredemptions'],
  platinum_stats:     ['platinumcards'],
  subscription_stats: ['healthysubscriptions'],
  feedback_stats:     ['feedbacks', 'feedback'],
  expansion_stats:    ['outofradiusattempts', 'notifyrequests'],
};

/**
 * Build a compact schema + intent hint injected right before the user message.
 * This forces the LLM to see the available collections + the right tool to call.
 */
function buildSchemaHint(clusters = [], understanding = {}) {
  const lines = [];

  // Always show a mini schema for easy LLM reference
  if (clusters.length) {
    lines.push('─── AVAILABLE COLLECTIONS (use execute_pipeline with these EXACT names) ───');
    for (const cluster of clusters) {
      lines.push(`[${cluster.label}] id:${cluster.connectionId}`);
      for (const col of cluster.collections.slice(0, 30)) {
        const fieldPreview = (col.fields || []).slice(0, 12).join(', ');
        lines.push(`  ${col.collection} (${col.count} docs) — fields: ${fieldPreview}`);
      }
    }
  }

  // Intent hint: steer LLM to the right collection + pipeline approach
  const metric = understanding?.constraints?.metric;
  const hintCollections = metric ? METRIC_COLLECTION_HINTS[metric] : null;

  if (hintCollections) {
    const matched = hintCollections.filter((hc) =>
      clusters.some((cl) => cl.collections.some((c) => c.collection.toLowerCase() === hc))
    );
    const targets = matched.length ? matched : hintCollections;
    lines.push('');
    lines.push(`─── ROUTING HINT ───`);
    lines.push(`This question is about "${metric}".`);
    lines.push(`Call get_live_schema first, then execute_pipeline on: ${targets.join(' or ')}`);
    lines.push(`DO NOT call export_order_customers, count_orders, or find_customers_within_radius for this question.`);
  }

  // Complex / negated user segment hint
  const msg = String(understanding?.original || '').toLowerCase();
  if (
    metric === null &&
    /\b(did not|didn'?t|haven'?t|never|without|no order|but joined|first order|new user|not order)\b/i.test(msg)
  ) {
    lines.push('');
    lines.push('─── ROUTING HINT ───');
    lines.push('This is a complex user segment query (e.g. users who joined but never ordered).');
    lines.push('Call get_live_schema, then use execute_pipeline with a $lookup or $match pipeline across users + orders collections.');
    lines.push('DO NOT call export_order_customers or find_customers_within_radius.');
  }

  return lines.length ? lines.join('\n') : null;
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

/** Detect hallucinated markdown tables / pipe dumps the model invents without tools. */
function looksLikeMarkdownTable(text = '') {
  const t = String(text || '');
  if (!t) return false;
  if (/\|[-:\s|]+\|/.test(t)) return true;
  const pipes = (t.match(/\|/g) || []).length;
  return pipes >= 8 && t.includes('|');
}

function hasStructuredOpsData(answer) {
  if (!answer) return false;
  return Boolean(
    (answer.customers && answer.customers.length) ||
      (answer.products && answer.products.length) ||
      (answer.metrics && answer.metrics.length) ||
      answer.primaryMetric != null ||
      (answer.clarification?.candidates && answer.clarification.candidates.length)
  );
}

/** Never treat model-fabricated markdown table prose as the answer. */
function cleanLlmProse(text = '') {
  const t = String(text || '').trim();
  if (!t) return '';
  if (looksLikeMarkdownTable(t) || looksLikePrivacyRefusal(t)) return '';
  // First sentence / line only, strip ** and links noise
  const line = t
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('|') && !/^[-*_]{3,}$/.test(l));
  if (!line) return '';
  return line
    .replace(/\*\*/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .slice(0, 280);
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

  // Load live schema from ALL connected clusters for multi-cluster awareness
  let liveClusters = [];
  try {
    liveClusters = await getAllClustersSchema(workspace._id);
  } catch {
    /* schema injection is best-effort */
  }

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

  let collectedToolResults = [];
  let lastText = '';
  let clarification = null;
  let productConfidence = null;

  // Understanding layer — normalize messy NL into a structured plan
  const understanding = understandQuery(message);
  emit('status', {
    stage: 'understanding',
    runId,
    label: understanding.normalized
      ? `Understood: ${understanding.normalized}`
      : 'Understanding your question…',
    normalized: understanding.normalized,
    plan: (understanding.plan || []).map((p) => p.label),
  });

  // Fast chat / store identity without tools
  if (understanding.kind === 'chat' || isGreeting(message)) {
    const chat = conversationalAnswer(message);
    if (chat) {
      await setStatus('ANSWERING');
      await appendTurn(conversation, message, chat.headline, chat);
      finishRun(runDoc, {
        status: 'COMPLETED',
        result: chat,
        tokenUsage,
        steps,
        started,
      });
      emit('result', chat);
      emit('complete', {
        conversationId: String(conversation._id),
        runId,
        durationMs: Date.now() - started,
      });
      clearToolContext();
      return { conversationId: conversation._id, runId, result: chat };
    }
  }

  // Orchestration path for analytics — period + radius + metric combined correctly
  if (understanding.analytics) {
    try {
      await setStatus('ORCHESTRATING', {
        label: 'Orchestrating live data steps…',
        normalized: understanding.normalized,
      });
      const orch = await orchestrateQuery(understanding, { emit, runId });

      if (orch.clarification) {
        await setStatus('NEEDS_CLARIFICATION');
        const answer = buildClarificationAnswer(
          {
            type: 'product',
            message: orch.clarification.message,
            candidates: orch.clarification.candidates || [],
          },
          orch.productConfidence
        );
        answer.understanding = {
          normalized: understanding.normalized,
          plan: (understanding.plan || []).map((p) => p.label),
        };
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
        clearToolContext();
        return { conversationId: conversation._id, runId, result: answer };
      }

      collectedToolResults = orch.toolResults || [];
      productConfidence = orch.productConfidence ?? productConfidence;

      for (const tr of collectedToolResults) {
        steps.push({
          tool: tr.tool,
          status: tr.result?.type === 'error' ? 'error' : 'success',
        });
      }

      await setStatus('VALIDATING');
      let answer = buildStructuredAnswer({
        text: '',
        toolResults: collectedToolResults,
        productConfidence,
        userMessage: message,
      });
      answer.understanding = {
        normalized: understanding.normalized,
        plan: (understanding.plan || []).map((p) => p.label),
        constraints: {
          metric: understanding.constraints?.metric,
          period: understanding.constraints?.period?.label,
          radiusKm: understanding.constraints?.radiusKm,
          status: understanding.constraints?.status?.label,
        },
      };

      if (isUsefulAnswer(answer) && hasStructuredOpsData(answer)) {
        const validation = validateMetricResult(answer);
        if (!validation.ok) answer.warnings = validation.issues;

        await setStatus('ANSWERING');
        await appendTurn(conversation, message, answer.headline, answer);
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
        });
        clearToolContext();
        return { conversationId: conversation._id, runId, result: answer };
      }

      // Fall through to LLM / recovery if orchestration returned empty
      emit('status', {
        stage: 'live',
        runId,
        label: 'Refining with model tools…',
      });
    } catch (orchErr) {
      emit('status', {
        stage: 'live',
        runId,
        label: `Orchestration retry: ${orchErr.message || 'fallback'}`,
      });
    }
  }

  const provider = createLlmProvider();
  const tools = getCohereToolDefs();

  // Assemble messages: system + optional summary + recent history + new user message
  const historyCtx = buildContextMessages(conversation, message);
  const messages = [{ role: 'system', content: systemPrompt(trainedCtx, learning, liveClusters) }];
  for (const m of historyCtx) {
    if (m.role === 'system' && m.content) {
      messages.push({ role: 'system', content: m.content });
    } else if (m.role === 'user' || m.role === 'assistant') {
      messages.push({ role: m.role, content: m.content || '' });
    }
  }

  // Inject a compact live-schema hint right before the user message so LLM sees it fresh.
  // Also inject an intent hint for non-fast-path analytics so LLM uses execute_pipeline.
  const schemaHint = buildSchemaHint(liveClusters, understanding);
  if (schemaHint) {
    messages.push({ role: 'system', content: schemaHint });
  }

  await setStatus('PLANNING');

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

    // Analytics MUST use tools. Ignore markdown/table hallucinations as "chat".
    const needsLiveData =
      isAnalyticsIntent(message) ||
      /\b(export|list|phone|registered|signup|platform users?|more than|at least)\b/i.test(
        message
      ) ||
      looksLikePrivacyRefusal(lastText) ||
      looksLikeMarkdownTable(lastText);

    if (
      needsLiveData &&
      !hasStructuredOpsData(answer) &&
      !hasMetricResult(collectedToolResults)
    ) {
      emit('status', { stage: 'recovery_tools', runId });
      answer = await runDeterministicFallback(message, emit);
    } else if (
      !hasMetricResult(collectedToolResults) &&
      lastText &&
      !needsLiveData &&
      !hasStructuredOpsData(answer)
    ) {
      const cleaned = cleanLlmProse(lastText);
      if (cleaned) {
        answer = {
          kind: 'chat',
          headline: cleaned,
          narrative: cleaned,
          explanation: cleaned,
          metrics: [],
          definitions: [],
          calculationSteps: ['Chat response'],
          sources: [],
          dimensions: {},
          confidence: { overall: 0.85 },
          clarification: null,
          freshness: 'live',
          period: null,
        };
      }
    }

    // Scrub any leftover table markdown if we got real rows later
    if (hasStructuredOpsData(answer)) {
      if (looksLikeMarkdownTable(answer.headline) || (answer.headline || '').length > 220) {
        if (answer.primaryMetric) {
          answer.headline = formatHeadline(answer.primaryMetric);
        } else if (answer.customers?.length) {
          answer.headline = `${answer.customers.length} customers`;
        }
      }
      if (looksLikeMarkdownTable(answer.narrative || '')) {
        answer.narrative = answer.explanation;
      }
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
      // Still emit clean error card (not markdown dump)
      const cleanFail = {
        ...answer,
        headline:
          cleanLlmProse(answer.headline) ||
          'Could not finish that live query. Try again with a clearer filter.',
        narrative: answer.explanation || null,
        explanation: answer.explanation || null,
      };
      emit('result', cleanFail);
      emit('complete', {
        conversationId: String(conversation._id),
        runId,
        durationMs: Date.now() - started,
        failed: true,
      });
      return {
        conversationId: conversation._id,
        runId,
        result: cleanFail,
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
  // Never accept markdown tables as a finished answer without real customer/product rows
  if (looksLikeMarkdownTable(blob) && !(answer.customers?.length || answer.products?.length)) {
    return false;
  }
  if (answer.kind === 'greeting') return true;
  if (answer.customers?.length > 0) return true;
  if (answer.products?.length > 0) return true;
  if (answer.metrics?.length > 0) return true;
  if (answer.primaryMetric != null) return true;
  if (answer.clarification?.candidates?.length) return true;
  if (answer.error === 'fallback_no_match') return false;
  if (answer.kind === 'chat') {
    const text = answer.headline || answer.narrative || '';
    if (looksLikePrivacyRefusal(text) || looksLikeMarkdownTable(text)) return false;
    return text.length > 8 && text.length < 600 && !text.includes('|---');
  }
  const h = String(answer.headline || '').toLowerCase();
  if (
    h.includes('analysis complete') ||
    h.includes('could not interpret') ||
    h.includes('no metrics returned') ||
    h.includes('no metric query ran') ||
    h.includes('could not map that') ||
    h.includes('try again') ||
    h.includes('running live data') ||
    h.includes('no live metric')
  ) {
    return false;
  }
  // Do NOT treat bare long headlines as useful — that was the hallucination path
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

    // Dynamic pipeline result — from execute_pipeline tool
    if (result.type === 'pipeline_result') {
      calculationSteps.push(
        `Queried ${result.collection} → ${result.rowCount} row${result.rowCount !== 1 ? 's' : ''}${result.truncated ? ' (truncated)' : ''}`
      );
      sources.push({
        kind: 'mongo',
        name: result.collection,
        freshness: 'live',
        detail: 'dynamic aggregation pipeline',
      });

      // Single numeric value → treat like a metric
      if (result.primaryValue != null) {
        const metricId = `${tool}_${result.collection}`;
        preferredMetricId = preferredMetricId || metricId;
        metrics.push({
          id: metricId,
          label: labelForDynamicResult(result),
          value: result.primaryValue,
          unit: 'count',
          pipelineRows: result.rows,
          collection: result.collection,
        });
      } else if (result.rows?.length) {
        // Multi-row result — expose as a customer-like list or products list
        // Try to detect if it's a ranked list (has a numeric value field)
        const firstRow = result.rows[0];
        const numKey = firstRow && Object.keys(firstRow).find(
          (k) => k !== '_id' && typeof firstRow[k] === 'number'
        );
        if (numKey) {
          products = result.rows.slice(0, 50).map((r) => ({
            name: String(r._id ?? r.name ?? r.label ?? r.key ?? 'Unknown'),
            orders: r[numKey],
            revenue: r.revenue ?? r.total ?? null,
          }));
          preferredMetricId = preferredMetricId || `pipeline_list`;
        } else {
          // Generic: expose as customer rows
          customers = result.rows.slice(0, 100).map((r) => ({
            name: r.name || r._id || 'N/A',
            phone: r.phone || r.mobile || null,
            orders: r.orders || r.count || null,
            ...r,
          }));
          const metricId = `pipeline_${result.collection}`;
          preferredMetricId = preferredMetricId || metricId;
          metrics.push({
            id: metricId,
            label: `${result.collection} results`,
            value: result.rowCount,
            unit: 'records',
          });
        }
      }
    }

    // get_live_schema result — informational, no metrics needed
    if (result.type === 'live_schema') {
      calculationSteps.push(`Discovered ${result.count} collections in cluster`);
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
  } else if (customers.length) {
    headline = `${customers.length} customers`;
  } else if (products.length) {
    headline = `Top ${products.length} products`;
  } else if (toolErrors.length) {
    headline = `Query failed: ${toolErrors[0]}`;
  } else {
    // Never paste model markdown tables as the headline (hallucination)
    const cleaned = cleanLlmProse(llmText);
    headline = cleaned || 'No live metrics returned for this question.';
  }

  for (const m of deduped) {
    if (m.id === 'repeat_rate' && typeof m.value === 'number' && m.value <= 1) {
      m.display = `${(m.value * 100).toFixed(1)}%`;
    }
  }

  const hasData = deduped.length > 0 || products.length > 0 || customers.length > 0;
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

  if (primary?.id === 'segment_customers' || primary?.id === 'export_customers') {
    const n = customers.length || primary.value;
    const minO = filters.min_orders;
    headline =
      minO != null
        ? `${n} customers with ≥${minO} orders`
        : `${n} customers`;
  }

  // Dimensions used in the query
  const dimensions = {
    metric: primary?.id || null,
    status: filters.statusLabel || (hasData ? statusHint?.label || null : null),
    statuses: filters.statuses || (hasData ? statusHint?.statuses || null : null),
    product: filters.product || filters.productName || null,
    productId: filters.productId || null,
    radius_km: filters.radiusKm ?? null,
    period:
      filters.periodLabel ||
      (filters.days != null ? `Last ${filters.days} days` : filters.allTime ? 'All time' : null),
    fromDate: filters.fromDate || null,
    toDate: filters.toDate || null,
    min_orders: filters.min_orders ?? null,
    currency: 'INR',
    store_origin:
      filters.radiusKm != null || customers.some((c) => c.distanceKm != null)
        ? { lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng }
        : null,
    dataset: customers.length
      ? 'live MongoDB · orders + users'
      : 'live MongoDB · orders',
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

  // Never append hallucinated markdown tables from the model
  const llmClean = cleanLlmProse(llmText);
  if (
    llmClean &&
    primary &&
    !llmClean.includes(String(primary.value)) &&
    !/^analysis complete\.?$/i.test(llmClean)
  ) {
    // Only short clarifying phrases, not tables
    if (llmClean.length < 180) {
      narrative = [narrative, llmClean].filter(Boolean).join(' ');
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
      name: customers.length ? 'orders + users' : 'orders',
      freshness: 'live',
      detail: 'Live aggregation on app MongoDB',
    });
  }

  return {
    headline: String(headline).slice(0, 240),
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
      (filters.allTime ? 'All time' : null) ||
      (hasData && !filters.fromDate ? null : null),
    narrative,
  };
}

function buildExplanation({ primary, filters, dimensions, productConfidence, customers, userMessage }) {
  const bits = [];
  if (customers?.length) {
    const minO = filters.min_orders;
    bits.push(
      minO != null
        ? `Listed ${customers.length} live customers with ≥${minO} completed orders (name & phone included).`
        : `Listed ${customers.length} live customers with name and phone.`
    );
    if (filters.periodLabel) bits.push(`Window: ${filters.periodLabel}.`);
    else if (filters.allTime) bits.push('Window: all-time orders.');
    else if (filters.days != null) bits.push(`Window: last ${filters.days} days.`);
    bits.push('Use Studio or CSV to export the full table.');
    return bits.join(' ');
  }
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
  } else if (primary?.id === 'registered_users') {
    bits.push('Counted documents in the live users collection (platform registrations).');
  } else if (primary?.id === 'referral_stats') {
    bits.push('Queried FriendReferral collection + User.referredByAgent to count everyone who joined via a referral link.');
  } else if (primary?.id === 'agent_stats') {
    bits.push('Queried live Agent collection: total agents, active count, orders generated, and commissions paid.');
  } else if (primary?.id === 'campaign_stats') {
    bits.push('Queried Campaign, CampaignLead, and CampaignRedemption collections for marketing performance.');
  } else if (primary?.id === 'platinum_stats') {
    bits.push('Queried PlatinumCard collection for active memberships and estimated monthly revenue.');
  } else if (primary?.id === 'subscription_stats') {
    bits.push('Queried HealthySubscription collection for meal-kit plan status breakdown and weekly revenue.');
  } else if (primary?.id === 'feedback_stats') {
    bits.push('Aggregated Feedback collection for average rating and star distribution.');
  } else if (primary?.id === 'expansion_stats') {
    bits.push('Queried OutOfRadiusAttempt and NotifyRequest collections for expansion demand signals.');
  } else if (primary) {
    bits.push(`Computed ${labelForMetric(primary.id)} from live Mongo.`);
  } else {
    bits.push('No live metric rows returned for this question.');
  }

  if (dimensions.period) bits.push(`Window: ${dimensions.period}.`);
  if (productConfidence != null && dimensions.product) {
    bits.push(`Product match confidence ${Math.round(productConfidence * 100)}%.`);
  }
  if (userMessage && /repeat/i.test(userMessage) && dimensions.product) {
    bits.push('Repeat = 2+ completed product orders for that buyer in the window.');
  }
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
    // New domains
    referral_stats: 'Users joined via referral',
    referrers: 'Active referrers',
    ordered: 'Joined & placed order',
    rewards_earned: 'Rewards earned',
    agent_referred: 'Agent-referred users',
    pending_requests: 'Pending referral requests',
    agent_stats: 'Total agents',
    active_agents: 'Active agents',
    total_orders: 'Orders via agents',
    total_leads: 'Leads generated',
    total_earnings: 'Commissions paid (₹)',
    campaign_stats: 'Campaign leads',
    active_campaigns: 'Active campaigns',
    campaigns: 'Total campaigns',
    redemptions: 'Discount redemptions',
    budget_used: 'Free items redeemed',
    platinum_stats: 'Active platinum members',
    total_issued: 'Total cards issued',
    new_in_period: 'New members in period',
    monthly_revenue: 'Est. monthly revenue (₹)',
    subscription_stats: 'Active subscriptions',
    total: 'Total subscriptions',
    pending: 'Pending approval',
    paused: 'Paused',
    cancelled: 'Cancelled',
    weekly_revenue: 'Weekly revenue (₹)',
    feedback_stats: 'Total reviews',
    avg_rating: 'Average rating',
    five_stars: '5-star reviews',
    four_stars: '4-star reviews',
    low_ratings: '1–3 star reviews',
    expansion_stats: 'Total interest signals',
    out_of_radius: 'Out-of-radius attempts',
    notify_me: '"Notify me" signups',
  };
  return map[id] || String(id || '').replace(/_/g, ' ');
}

function labelForDynamicResult(result) {
  if (!result) return 'Result';
  const { collection, primaryKey } = result;
  if (primaryKey && primaryKey !== 'value') {
    return `${String(collection)} — ${String(primaryKey)}`;
  }
  return `${String(collection)} query`;
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
  // Domain-specific headlines
  const domainHeadlines = {
    referral_stats: (v) => `${v} users joined via referral`,
    agent_stats: (v) => `${v} agents`,
    campaign_stats: (v) => `${v} campaign leads`,
    platinum_stats: (v) => `${v} active platinum members`,
    subscription_stats: (v) => `${v} active subscriptions`,
    feedback_stats: (v) => `${v} reviews`,
    expansion_stats: (v) => `${v} expansion signals`,
  };
  if (domainHeadlines[metric.id]) {
    return domainHeadlines[metric.id](Number(metric.value).toLocaleString('en-IN'));
  }
  const unit =
    metric.unit === 'orders'
      ? 'orders'
      : metric.unit === 'customers'
        ? 'customers'
        : metric.unit === 'members'
          ? 'members'
          : metric.unit === 'reviews'
            ? 'reviews'
            : metric.unit === 'agents'
              ? 'agents'
              : metric.unit === 'leads'
                ? 'leads'
                : metric.unit === 'requests'
                  ? 'requests'
                  : metric.unit === 'subscriptions'
                    ? 'subscriptions'
                    : metric.unit || '';
  return `${Number(metric.value).toLocaleString('en-IN')} ${unit}`.trim();
}

/**
 * Recovery tools engine (secondary). AI is primary; this only helps when LLM is down or incomplete.
 * Intentionally flexible tool calls, not a fixed FAQ only.
 */
export async function runDeterministicFallback(message, emit = () => {}) {
  emit('status', {
    stage: 'understanding',
    mode: 'recovery_tools',
    label: 'Understanding your question…',
  });

  // Prefer the same understanding + orchestration path
  try {
    const understanding = understandQuery(message);
    if (understanding.analytics) {
      emit('status', {
        stage: 'understanding',
        label: understanding.normalized
          ? `Understood: ${understanding.normalized}`
          : 'Understood',
        normalized: understanding.normalized,
        plan: (understanding.plan || []).map((p) => p.label),
      });
      const orch = await orchestrateQuery(understanding, { emit });
      if (orch.clarification) {
        return buildClarificationAnswer(
          {
            type: 'product',
            message: orch.clarification.message,
            candidates: orch.clarification.candidates || [],
          },
          orch.productConfidence
        );
      }
      const answer = buildStructuredAnswer({
        text: '',
        toolResults: orch.toolResults || [],
        productConfidence: orch.productConfidence,
        userMessage: message,
      });
      answer.understanding = {
        normalized: understanding.normalized,
        plan: (understanding.plan || []).map((p) => p.label),
      };
      if (isUsefulAnswer(answer) && hasStructuredOpsData(answer)) {
        return answer;
      }
    }
  } catch {
    /* continue legacy recovery */
  }

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
    // Also treat "more than 5 orders" loosely as ≥5 when phrasing is "with more than N order"
    // Keep strict more-than as N+1; for "5+ orders" style:
    const plus = lower.match(/(\d+)\+\s*(?:orders?|times)/);
    if (plus) minOrders = Number(plus[1]);

    const hasExplicitWindow =
      /\b(last|yesterday|today|this\s+month|previous|week|din|days?|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(
        lower
      );

    emit('status', { stage: 'querying', tool: 'query_customers' });
    const r = await executeTool('query_customers', {
      ...(hasExplicitWindow ? dateArgs : {}),
      all_time: !hasExplicitWindow,
      min_orders: minOrders,
      statuses: status.statuses,
      limit: 200,
      periodLabel: hasExplicitWindow ? dateArgs.periodLabel : 'All time',
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

  if (tmpl?.id === 'count_orders_in_radius') {
    emit('status', {
      stage: 'live',
      label: `Counting orders within ${tmpl.args?.radius_km ?? radiusKm} km…`,
      tool: 'count_orders_in_radius',
    });
    const r = await executeTool('count_orders_in_radius', {
      ...dateArgs,
      ...(tmpl.args || {}),
      statuses: tmpl.args?.statuses || status.statuses,
      statusLabel: tmpl.args?.statusLabel || status.label,
    });
    return buildStructuredAnswer({
      text: '',
      toolResults: [{ tool: 'count_orders_in_radius', result: r.result }],
      productConfidence: null,
      userMessage: message,
    });
  }

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
    'count_orders_in_radius',
    'get_referral_stats',
    'get_agent_stats',
    'get_campaign_stats',
    'get_platinum_stats',
    'get_subscription_stats',
    'get_feedback_stats',
    'get_expansion_stats',
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
