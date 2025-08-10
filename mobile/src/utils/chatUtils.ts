export const getUserColor = (username: string): string => {
  const colors = ['#FF6B35', '#4ECDC4', '#45B7D1', '#FFA726', '#66BB6A', '#EF5350', '#AB47BC', '#26A69A'];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const messageDate = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return formatTime(dateString);
};

export const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
