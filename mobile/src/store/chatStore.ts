import { create } from "zustand";
import { ChatMessage, chatService } from "../api/chatService";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  typingUsers: string[];
  unreadCount: number;
  
  fetchMessages: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  addReaction: (messageId: number, emoji: string) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  updateReactions: (messageId: number, reactions: any[]) => void;
  setTypingUsers: (users: string[]) => void;
  markAsRead: (messageId: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  typingUsers: [],
  unreadCount: 0,

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

  markAsRead: async (messageId: number) => {
    try {
      await chatService.markAsRead(messageId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to mark as read",
      });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { unreadCount } = await chatService.getUnreadCount();
      set({ unreadCount });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  setUnreadCount: (count: number) => {
    set({ unreadCount: count });
  },

  clearError: () => {
    set({ error: null });
  },
}));
