import { api } from "./apiClient";

export interface ChatMessage {
  id: number;
  message: string;
  created_at: string;
  user_id: string;
  username: string;
  reactions: ChatReaction[];
}

export interface ChatReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface SendMessageData {
  message: string;
}

export interface AddReactionData {
  emoji: string;
}

export const chatService = {
  async getMessages(limit = 50, offset = 0) {
    const { data } = await api.get<ChatMessage[]>("/chat/messages", {
      params: { limit, offset }
    });
    return data;
  },

  async sendMessage(messageData: SendMessageData) {
    const { data } = await api.post<ChatMessage>("/chat/messages", messageData);
    return data;
  },

  async addReaction(messageId: number, reactionData: AddReactionData) {
    const { data } = await api.post<{ success: boolean }>(
      `/chat/messages/${messageId}/reactions`,
      reactionData
    );
    return data;
  },
};
