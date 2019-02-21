import { EffectMetadata } from './effects.interface';
import { AsyncScheduler } from 'rxjs/internal/scheduler/AsyncScheduler';
import { SchedulerLike } from 'rxjs';
import { ContextReader } from '../context/context.factory';

export const createEffectMetadata = <T extends SchedulerLike, U extends Error>(
  metadata: { ask: ContextReader, scheduler?: T, error?: U; }
): EffectMetadata<U> => ({
  ask: metadata.ask,
  scheduler: metadata.scheduler || AsyncScheduler as any,
  error: metadata.error,
});
