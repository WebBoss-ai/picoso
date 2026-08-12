/**
 * Orchestration layer — execute the understood plan step-by-step and combine results.
 */

import { executeTool } from '../tools/registry.js';
import { planToolCalls } from './understand.js';

/**
 * Run planned tools with live human-readable progress.
 * Returns toolResults for buildStructuredAnswer in the agent runtime.
 */
export async function orchestrateQuery(understanding, { emit = () => {}, runId } = {}) {
  const toolResults = [];
  const plan = understanding.plan || [];

  emit('status', {
    stage: 'understanding',
    runId,
    label: understanding.normalized
      ? `Understood: ${understanding.normalized}`
      : 'Understanding your question…',
    normalized: understanding.normalized,
    plan: plan.map((p) => p.label),
  });

  // Emit planned steps so the UI can show the full roadmap
  for (const step of plan) {
    if (step.id === 'understand') continue;
    emit('status', {
      stage: 'live',
      runId,
      step: step.id,
      label: step.label,
      pending: true,
      normalized: understanding.normalized,
    });
  }

  const calls = planToolCalls(understanding);
  let productMatch = null;

  for (const call of calls) {
    emit('status', {
      stage: 'live',
      runId,
      step: call.name,
      label: call.stepLabel || `Running ${call.name}…`,
      tool: call.name,
      normalized: understanding.normalized,
    });

    let args = { ...(call.arguments || {}) };
    if (call.needsProductId) {
      if (!productMatch?.productId && !productMatch?.name) {
        continue;
      }
      args.product_id = productMatch.productId;
      args.product_name = productMatch.name;
    }

    const executed = await executeTool(call.name, args);
    toolResults.push({ tool: call.name, result: executed.result });

    if (call.name === 'resolve_product' && executed.result?.match) {
      productMatch = executed.result.match;
    }
    if (call.name === 'resolve_product' && executed.result?.needsClarification) {
      return {
        clarification: executed.result,
        productConfidence: executed.result.confidence,
        toolResults,
        understanding,
      };
    }
  }

  emit('status', {
    stage: 'live',
    runId,
    step: 'compose',
    label: 'Combining results into a clear answer…',
    normalized: understanding.normalized,
  });

  return {
    toolResults,
    understanding,
    productConfidence: productMatch ? 0.9 : null,
  };
}
