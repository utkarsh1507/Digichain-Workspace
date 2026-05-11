export function isDailyMeeting(meeting) {
  return meeting?.recurring === 'daily';
}

export function getMeetingOccurrenceDate(meeting, today) {
  if (isDailyMeeting(meeting) && meeting?.date <= today) {
    return today;
  }
  return meeting?.date || '';
}

export function isMeetingToday(meeting, today) {
  return getMeetingOccurrenceDate(meeting, today) === today;
}

export function isUpcomingMeeting(meeting, today) {
  return getMeetingOccurrenceDate(meeting, today) >= today;
}

export function isPastMeeting(meeting, today) {
  return !isDailyMeeting(meeting) && (meeting?.date || '') < today;
}

export function isPastMeetingWithinRetention(meeting, today, retentionDays = 7) {
  if (!isPastMeeting(meeting, today)) return false;
  const meetingDate = new Date(`${meeting.date}T00:00:00`);
  const todayDate = new Date(`${today}T00:00:00`);
  const diffDays = Math.floor((todayDate.getTime() - meetingDate.getTime()) / 86400000);
  return diffDays <= retentionDays;
}

export function sortMeetingsByNextOccurrence(meetings, today) {
  return [...meetings].sort((a, b) => {
    const dateCompare = getMeetingOccurrenceDate(a, today).localeCompare(getMeetingOccurrenceDate(b, today));
    if (dateCompare !== 0) return dateCompare;
    return (a.time || '').localeCompare(b.time || '');
  });
}

export function isMeetingWithinNextWeek(meeting, today) {
  const occurrence = new Date(`${getMeetingOccurrenceDate(meeting, today)}T00:00:00`);
  const start = new Date(`${today}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return occurrence >= start && occurrence <= end;
}
