import { create } from "zustand";
import { ChatMessage, chatService } from "../api/chatService";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  typingUsers: string[];
  
  fetchMessages: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  addReaction: (messageId: number, emoji: string) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  updateReactions: (messageId: number, reactions: any[]) => void;
  setTypingUsers: (users: string[]) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  typingUsers: [],

  fetchMessages: async () => {
    set({ isLoading: true, error: null });
    try {
      const messages = await chatService.getMessages();
      set({ messages, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch messages",
        isLoading: false,
      });
    }
  },

  sendMessage: async (message: string) => {
    set({ error: null });
    try {
      const newMessage = await chatService.sendMessage({ message });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to send message",
      });
    }
  },

  addReaction: async (messageId: number, emoji: string) => {
    try {
      await chatService.addReaction(messageId, { emoji });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to add reaction",
      });
    }
  },

  addMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateReactions: (messageId: number, reactions: any[]) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, reactions } : msg
      ),
    }));
  },

  setTypingUsers: (users: string[]) => {
    set({ typingUsers: users });
  },

  clearError: () => {
    set({ error: null });
  },
}));
