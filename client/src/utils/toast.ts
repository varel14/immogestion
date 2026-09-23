export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<(items: ToastItem[]) => void>();

function emit() {
  for (const listener of listeners) listener([...items]);
}

function push(type: ToastType, message: string) {
  const id = ++seq;
  items = [...items, { id, type, message }];
  emit();
  setTimeout(() => {
    items = items.filter((item) => item.id !== id);
    emit();
  }, 4000);
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
};

export function subscribeToToasts(listener: (items: ToastItem[]) => void): () => void {
  listeners.add(listener);
  listener([...items]);
  return () => {
    listeners.delete(listener);
  };
}
