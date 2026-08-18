/**
 * WP Campaign Scheduler
 * Polls MongoDB every 60 s for pending WpScheduledJob records whose
 * scheduledAt timestamp is in the past, then executes them sequentially.
 */

import { WpScheduledJob } from '../models/wpMarketingModels.js';
import { executePhaseRun } from './wpExecutionEngine.js';

let schedulerStarted = false;

export function startScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const tick = async () => {
    try {
      const now  = new Date();
      const jobs = await WpScheduledJob.find({
        status:      'pending',
        scheduledAt: { $lte: now },
      }).limit(3); // process max 3 at a time to avoid overload

      for (const job of jobs) {
        await WpScheduledJob.findByIdAndUpdate(job._id, { status: 'running' });
        console.log(`[Scheduler] ▶  Phase ${job.phaseNumber} Run ${job.runNumber} — exp:${job.experimentId}`);

        try {
          const run = await executePhaseRun(
            job.experimentId.toString(),
            job.phaseIndex,
            job.templateConfig || {},
          );
          await WpScheduledJob.findByIdAndUpdate(job._id, {
            status:     'completed',
            executedAt: new Date(),
            runId:      run._id,
          });
          console.log(`[Scheduler] ✅ Phase ${job.phaseNumber} Run ${job.runNumber} completed — ${run.contactCount} sent`);
        } catch (err) {
          await WpScheduledJob.findByIdAndUpdate(job._id, {
            status: 'failed',
            error:  err.message,
          });
          console.error(`[Scheduler] ❌ Phase ${job.phaseNumber} Run ${job.runNumber} failed: ${err.message}`);
        }
      }
    } catch (err) {
      console.error('[Scheduler] tick error:', err.message);
    }
  };

  setInterval(tick, 60 * 1000);
  console.log('📅 WP Campaign Scheduler started (60 s polling interval)');
}
