import { getStorageItem, setStorageItem, removeStorageItems } from "./storageAdapter";
import { STORAGE_KEYS } from "./storageKeys";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type ConversationMeta = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  providerId: string;
  model: string;
};

export type ConversationStore = {
  version: 1;
  activeId: string | null;
  list: ConversationMeta[];
};

const EMPTY_STORE: ConversationStore = {
  version: 1,
  activeId: null,
  list: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const deriveTitle = (firstUserMessage: string): string =>
  firstUserMessage.trim().slice(0, 40) || "Untitled";

const shortId = () =>
  Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------------------
// Index CRUD
// ---------------------------------------------------------------------------

export const loadConversationIndex = async (): Promise<ConversationStore> => {
  const stored = await getStorageItem<ConversationStore>(STORAGE_KEYS.conversationIndex);
  return stored ?? { ...EMPTY_STORE };
};

export const saveConversationIndex = (store: ConversationStore): Promise<void> =>
  setStorageItem(STORAGE_KEYS.conversationIndex, store);

// ---------------------------------------------------------------------------
// Messages CRUD
// ---------------------------------------------------------------------------

export const loadMessages = async (id: string): Promise<StoredMessage[]> => {
  const stored = await getStorageItem<{ messages: StoredMessage[] }>(
    STORAGE_KEYS.conversationMessages(id),
  );
  return stored?.messages ?? [];
};

export const saveMessages = (id: string, messages: StoredMessage[]): Promise<void> =>
  setStorageItem(STORAGE_KEYS.conversationMessages(id), { messages });

// ---------------------------------------------------------------------------
// High-level operations
// ---------------------------------------------------------------------------

/** Create a new conversation and set it as active. Returns the updated store. */
export const createConversation = async (
  providerId: string,
  model: string,
  firstUserMessage: string,
): Promise<{ store: ConversationStore; meta: ConversationMeta }> => {
  const store = await loadConversationIndex();
  const now = new Date().toISOString();
  const meta: ConversationMeta = {
    id: shortId(),
    title: deriveTitle(firstUserMessage),
    createdAt: now,
    updatedAt: now,
    providerId,
    model,
  };
  const updated: ConversationStore = {
    ...store,
    activeId: meta.id,
    list: [meta, ...store.list],
  };
  await saveConversationIndex(updated);
  return { store: updated, meta };
};

/** Update updatedAt and title on an existing conversation. */
export const touchConversation = async (id: string): Promise<void> => {
  const store = await loadConversationIndex();
  const updated: ConversationStore = {
    ...store,
    list: store.list.map((c) =>
      c.id === id ? { ...c, updatedAt: new Date().toISOString() } : c,
    ),
  };
  await saveConversationIndex(updated);
};

/** Set a different conversation as active. */
export const setActiveConversation = async (id: string | null): Promise<void> => {
  const store = await loadConversationIndex();
  await saveConversationIndex({ ...store, activeId: id });
};

/** Delete a conversation and its messages. */
export const deleteConversation = async (id: string): Promise<void> => {
  const store = await loadConversationIndex();
  const updated: ConversationStore = {
    ...store,
    activeId: store.activeId === id ? (store.list.find((c) => c.id !== id)?.id ?? null) : store.activeId,
    list: store.list.filter((c) => c.id !== id),
  };
  await saveConversationIndex(updated);
  await removeStorageItems([STORAGE_KEYS.conversationMessages(id)]);
};
