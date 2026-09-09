export interface LiveRegionState {
  polite: string;
  assertive: string;
}

interface Listener {
  (state: LiveRegionState): void;
}

let state: LiveRegionState = { polite: "", assertive: "" };
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    listener(state);
  }
}

export function subscribeLiveRegion(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function announceLiveRegion(
  message: string,
  { assertive = false }: { assertive?: boolean } = {},
): void {
  state = assertive ? { ...state, assertive: message } : { ...state, polite: message };
  emit();
}

export function clearLiveRegion(): void {
  state = { polite: "", assertive: "" };
  emit();
}
