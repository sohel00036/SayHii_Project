import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Listen for standard messages
    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      const { messages } = get();
      // Skip if message already exists (e.g. replaced by aiMessageDone)
      if (messages.some((m) => m._id === newMessage._id)) return;

      set({
        messages: [...messages, newMessage],
      });
    });

    // Listen for AI streaming token chunks
    socket.on("aiMessageChunk", (chunkData) => {
      const { tempMessageId, senderId, textChunk, fullText } = chunkData;
      if (senderId !== selectedUser._id) return;

      const { messages } = get();
      const existingIndex = messages.findIndex((m) => m._id === tempMessageId);

      if (existingIndex !== -1) {
        const updatedMessages = [...messages];
        updatedMessages[existingIndex] = {
          ...updatedMessages[existingIndex],
          text: fullText !== undefined ? fullText : updatedMessages[existingIndex].text + (textChunk || ""),
        };
        set({ messages: updatedMessages });
      } else {
        const newTempMessage = {
          _id: tempMessageId,
          senderId,
          receiverId: useAuthStore.getState().authUser?._id,
          text: fullText || textChunk || "",
          isStreaming: true,
          createdAt: new Date().toISOString(),
        };
        set({ messages: [...messages, newTempMessage] });
      }
    });

    // Listen for AI streaming completion
    socket.on("aiMessageDone", ({ tempMessageId, message }) => {
      if (message.senderId !== selectedUser._id) return;

      const { messages } = get();
      const existingIndex = messages.findIndex((m) => m._id === tempMessageId || m._id === message._id);

      if (existingIndex !== -1) {
        const updatedMessages = [...messages];
        updatedMessages[existingIndex] = message;
        set({ messages: updatedMessages });
      } else {
        set({ messages: [...messages, message] });
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("aiMessageChunk");
    socket.off("aiMessageDone");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
