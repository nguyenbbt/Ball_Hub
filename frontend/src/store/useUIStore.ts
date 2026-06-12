import { create } from 'zustand';

interface UIState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  setLeftSidebar: (isOpen: boolean) => void;
  toggleRightSidebar: () => void;
  setRightSidebar: (isOpen: boolean) => void;
  activeChatUserId: string | null;
  setActiveChatUserId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  leftSidebarOpen: false,
  rightSidebarOpen: false,
  toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  setLeftSidebar: (isOpen) => set({ leftSidebarOpen: isOpen }),
  toggleRightSidebar: () => set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
  setRightSidebar: (isOpen) => set({ rightSidebarOpen: isOpen }),
  activeChatUserId: null,
  setActiveChatUserId: (id) => set({ activeChatUserId: id }),
}));
