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

      // Move contact to top of human list in sidebar
      get().updateUserOrder(selectedUser._id, res.data.createdAt);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // Helper to reorder contact list putting updatedUser at top of human list (below bot)
  updateUserOrder: (userId, messageTime = new Date().toISOString()) => {
    const { users } = get();
    if (!users || users.length === 0 || !userId) return;

    const targetUser = users.find((u) => u._id.toString() === userId.toString());
    if (!targetUser) return;

    // Do not reorder if it's the bot user (bot stays pinned at top)
    if (targetUser.isBot) return;

    // Update target user's lastMessageTime
    const updatedTargetUser = { ...targetUser, lastMessageTime: messageTime };

    // Filter out target user
    const remainingUsers = users.filter((u) => u._id.toString() !== userId.toString());

    // Separate bot and human users
    const botUsers = remainingUsers.filter((u) => u.isBot);
    const humanUsers = remainingUsers.filter((u) => !u.isBot);

    // Place target user at top of human users list (below bot)
    const newUsers = [...botUsers, updatedTargetUser, ...humanUsers];
    set({ users: newUsers });
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Clean up existing handlers to avoid duplicates
    socket.off("newMessage");
    socket.off("aiMessageChunk");
    socket.off("aiMessageDone");

    // Listen for standard messages
    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages } = get();
      const authUserId = useAuthStore.getState().authUser?._id?.toString();

      const senderIdStr = (newMessage.senderId?._id || newMessage.senderId).toString();
      const receiverIdStr = (newMessage.receiverId?._id || newMessage.receiverId).toString();

      // Reorder sidebar contacts for both sender and receiver
      const otherUserId = senderIdStr === authUserId ? receiverIdStr : senderIdStr;
      if (otherUserId) {
        get().updateUserOrder(otherUserId, newMessage.createdAt);
      }

      if (!selectedUser) return;
      const selectedUserIdStr = selectedUser._id.toString();

      // Only add message if it belongs to the active conversation
      const isRelevant = senderIdStr === selectedUserIdStr || receiverIdStr === selectedUserIdStr;
      if (!isRelevant) return;

      // Skip if message already exists
      if (messages.some((m) => m._id.toString() === newMessage._id.toString())) return;

      set({
        messages: [...messages, newMessage],
      });
    });

    // Listen for AI streaming token chunks
    socket.on("aiMessageChunk", (chunkData) => {
      const { selectedUser, messages } = get();
      if (!selectedUser) return;

      const { tempMessageId, senderId, textChunk, fullText } = chunkData;
      if (senderId.toString() !== selectedUser._id.toString()) return;

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
      const { selectedUser, messages } = get();
      if (!selectedUser) return;

      if (message.senderId.toString() !== selectedUser._id.toString()) return;

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
