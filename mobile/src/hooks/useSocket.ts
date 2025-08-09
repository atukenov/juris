import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useChatStore } from "../store/chatStore";

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { addMessage, updateReactions, setTypingUsers, setUnreadCount } = useChatStore();

  useEffect(() => {
    const initSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        if (!token) return;

        const socket = io(
          process.env.EXPO_PUBLIC_API_URL || "http://192.168.100.46:3000",
          {
            auth: { token },
          }
        );

        socket.on("connect", () => {
          console.log("Connected to chat server");
        });

        socket.on("newMessage", (message) => {
          addMessage(message);
        });

        socket.on("reactionUpdate", ({ messageId, reactions }) => {
          updateReactions(messageId, reactions);
        });

        socket.on("typingUpdate", ({ typers }) => {
          setTypingUsers(typers);
        });
        
        socket.on('unreadCountUpdate', ({ userId, unreadCount }) => {
          const currentUserId = parseInt(token.split('.')[1] ? 
            JSON.parse(atob(token.split('.')[1])).userId || 
            JSON.parse(atob(token.split('.')[1])).id : 0);
          if (userId === currentUserId) {
            setUnreadCount(unreadCount);
          }
        });

        socket.on('disconnect', () => {
          console.log('Disconnected from chat server');
        });

        socketRef.current = socket;
      } catch (error) {
        console.error("Socket connection error:", error);
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [addMessage, updateReactions, setTypingUsers, setUnreadCount]);

  const sendMessage = (message: string) => {
    if (socketRef.current) {
      socketRef.current.emit("sendMessage", { message });
    }
  };

  const setTyping = (isTyping: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit("typing", { isTyping });
    }
  };

  const addReaction = (messageId: number, emoji: string) => {
    if (socketRef.current) {
      socketRef.current.emit("addReaction", { messageId, emoji });
    }
  };

  return {
    sendMessage,
    setTyping,
    addReaction,
    isConnected: socketRef.current?.connected || false,
  };
};
