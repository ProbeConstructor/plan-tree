import { writable } from "svelte/store";

export interface ModalState {
  component: any;
  props?: Record<string, unknown>;
}

export const modal = writable<ModalState>({
  component: null,
});

export function openModal(component: any, props: Record<string, unknown> = {}) {
  modal.set({
    component,
    props,
  });
}

export function closeModal() {
  modal.set({
    component: null,
  });
}
