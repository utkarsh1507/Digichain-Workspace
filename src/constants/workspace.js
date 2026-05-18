export const CHANNEL_ICON_OPTIONS = [
  { value: '💬', label: 'General discussion' },
  { value: '💻', label: 'Technical' },
  { value: '📣', label: 'Announcements' },
  { value: '🛠️', label: 'Operations' },
  { value: '🎨', label: 'Design' },
  { value: '📈', label: 'Growth' },
  { value: '🤝', label: 'Teamwork' },
  { value: '🚀', label: 'Launches' },
];

export const LEAVE_TYPE_CONFIG = [
  { id: 'Casual', label: 'Casual Leave', balanceKey: 'casualLeaveTotal' },
  { id: 'Sick', label: 'Sick Leave', balanceKey: 'sickLeaveTotal' },
  { id: 'Earned', label: 'Earned Leave', balanceKey: 'earnedLeaveTotal' },
  { id: 'WFH', label: 'Work From Home', balanceKey: 'wfhLeaveTotal' },
  { id: 'Unpaid', label: 'Unpaid Leave', balanceKey: 'unpaidLeaveTotal' },
];

export function getLeaveTotal(user, typeId) {
  const config = LEAVE_TYPE_CONFIG.find((item) => item.id === typeId);
  if (!config) return 0;
  return Number(user?.[config.balanceKey] ?? 0);
}

export function getChannelEmoji(channel) {
  return channel?.emoji?.trim() || '#';
}
