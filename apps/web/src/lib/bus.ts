import { EventEmitter } from "events";

const g = globalThis as unknown as { __innoverseBus?: EventEmitter };

if (!g.__innoverseBus) {
  g.__innoverseBus = new EventEmitter();
  g.__innoverseBus.setMaxListeners(200);
}

export const bus: EventEmitter = g.__innoverseBus;

export function publish(channel: string, event: Record<string, unknown>) {
  bus.emit(channel, event);
}
