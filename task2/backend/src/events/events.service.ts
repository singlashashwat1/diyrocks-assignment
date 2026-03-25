import { Injectable, MessageEvent } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, Subject, merge, interval } from 'rxjs';
import { map } from 'rxjs/operators';
import { CreateEventDto } from './dto/create-event.dto';

/** Priority tier used for eviction ordering (low evicted before normal; high is never evicted). */
export type EventPriority = 'low' | 'normal' | 'high';

/** One activity item stored in the in-memory ring buffer and pushed over SSE. */
export interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  priority: EventPriority;
  /** Epoch ms; used for GET /events sort order and for “oldest” eviction. */
  timestamp: number;
}

/** Maximum number of events retained in memory (assessment requirement). */
const MAX_BUFFER = 50;

/**
 * In-memory event buffer with priority-aware eviction and a hot stream for SSE clients.
 *
 * Eviction rules (when buffer is already full):
 * 1. Remove the **oldest** event with priority `low` (smallest timestamp among lows).
 * 2. If none, remove the **oldest** `normal`.
 * 3. Never remove `high`. If every slot is `high`, the new event is rejected (HTTP 429 at controller).
 */
@Injectable()
export class EventsService {
  /** Mutable FIFO-ish list; order is not guaranteed to match time order after splices. */
  private readonly events: ActivityEvent[] = [];

  /** Emits each newly accepted event so SSE subscribers receive it immediately. */
  private readonly stream$ = new Subject<ActivityEvent>();

  /**
   * Snapshot for GET /events: returns a copy sorted **newest first** (descending timestamp).
   */
  getAllSorted(): ActivityEvent[] {
    return [...this.events].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Append a new event, enforcing MAX_BUFFER with priority-based eviction.
   *
   * Flow:
   * - If length is less than MAX_BUFFER: push and broadcast.
   * - If full: try to drop one oldest `low`, then push; else try oldest `normal`, then push.
   * - If full and only `high` events exist: cannot free a slot → `{ accepted: false }`.
   *
   * On success, pushes to `stream$` so connected SSE clients get the same payload.
   */
  addEvent(dto: CreateEventDto):
    | { accepted: true; event: ActivityEvent }
    | { accepted: false; reason: 'buffer_full_high_only' } {
    const event: ActivityEvent = {
      id: randomUUID(),
      type: dto.type,
      message: dto.message,
      priority: dto.priority,
      timestamp: Date.now(),
    };

    if (this.events.length < MAX_BUFFER) {
      this.events.push(event);
      this.stream$.next(event);
      return { accepted: true, event };
    }

    const lowIdx = this.findOldestIndex((p) => p === 'low');
    if (lowIdx >= 0) {
      this.events.splice(lowIdx, 1);
      this.events.push(event);
      this.stream$.next(event);
      return { accepted: true, event };
    }

    const normalIdx = this.findOldestIndex((p) => p === 'normal');
    if (normalIdx >= 0) {
      this.events.splice(normalIdx, 1);
      this.events.push(event);
      this.stream$.next(event);
      return { accepted: true, event };
    }

    return { accepted: false, reason: 'buffer_full_high_only' };
  }

  /**
   * Finds the array index of the **oldest** event (minimum `timestamp`) whose priority matches `pred`.
   * Returns -1 if no such event exists.
   */
  private findOldestIndex(
    pred: (p: EventPriority) => boolean,
  ): number {
    let best = -1;
    let bestTs = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i];
      if (pred(e.priority) && e.timestamp < bestTs) {
        bestTs = e.timestamp;
        best = i;
      }
    }
    return best;
  }

  /**
   * Observable consumed by GET /events/stream (SSE).
   *
   * - **Data events**: each accepted `ActivityEvent` is serialized as SSE `data` (JSON).
   * - **Heartbeats**: periodic messages keep some proxies from closing idle connections;
   *   clients should ignore payloads with `kind: 'heartbeat'`.
   */
  eventStream(): Observable<MessageEvent> {
    const heartbeats = interval(20000).pipe(
      map(
        () =>
          ({
            data: { kind: 'heartbeat', at: Date.now() },
          }) as MessageEvent,
      ),
    );
    const pushes = this.stream$.pipe(
      map((e: ActivityEvent) => ({ data: e }) as MessageEvent),
    );
    return merge(heartbeats, pushes);
  }
}
