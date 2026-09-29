// Pure helpers for member messaging (src/messages/). No React here.
import { format, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';
import { isMissingSchema, displayName } from '../boards/utils';

export { isMissingSchema, displayName, tokenizeLinks } from '../boards/utils';

export const MESSAGE_PAGE = 50;   // messages per "load older"
export const INBOX_LIMIT = 100;   // conversations shown in the inbox
export const BODY_MAX = 5000;     // matches messages_body_check
export const TITLE_MAX = 120;     // matches conversations.title check
export const GROUP_MAX = 50;      // members per group, including the owner
export const POLL_MS = 8000;      // fallback polling when Realtime is unavailable

export const MESSAGE_COLS = 'id, conversation_id, sender_id, body, created_at, edited_at, deleted_at';
export const INBOX_COLS = 'id, is_group, title, direct_key, created_by, last_message_at, my_role, last_read_at, unread, member_ids, last_message_id, last_sender_id, last_body, last_deleted, last_created_at';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SETUP_MESSAGE = 'Messages are being set up — check back soon.';

// ── URL state: /community?tab=messages&c=<conversation id> ─────────────────
export function readMessagesLocation() {
  const params = new URLSearchParams(window.location.search);
  const c = params.get('c');
  return { tab: params.get('tab'), c: c && UUID_RE.test(c) ? c : null };
}

export function messagesHref({ c = null } = {}) {
  const params = new URLSearchParams(window.location.search);
  params.set('tab', 'messages');
  if (c) params.set('c', c); else params.delete('c');
  return `${window.location.pathname}?${params.toString()}`;
}

// Tell the site nav (src/shell/aimg-nav.js) to refresh its unread badge.
export function notifyMessagesChanged() {
  window.dispatchEvent(new CustomEvent('aimg:messages-changed'));
}

// ── Errors ─────────────────────────────────────────────────────────────────
export function friendlyError(error) {
  if (!error) return '';
  if (isMissingSchema(error)) return SETUP_MESSAGE;
  const msg = error.message || String(error);
  if (error.code === '42501' || error.code === 'not_permitted' || /row-level security|permission denied/i.test(msg)) {
    // Our RPCs raise 42501 with a readable reason; RLS errors are generic.
    return /row-level security|permission denied|not permitted/i.test(msg)
      ? "You don't have permission to do that here."
      : msg;
  }
  if (error.code === '23514') return 'That message is too long or empty.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Network hiccup — check your connection and try again.';
  return msg || 'Something went wrong — please try again.';
}

// An UPDATE filtered out by RLS affects zero rows without an error.
export const NOT_PERMITTED = { code: 'not_permitted', message: 'not permitted' };

// ── People ─────────────────────────────────────────────────────────────────
// Name for a member id: their profile name, "You" for me, else "Member".
export function nameFor(id, profiles, myId) {
  if (id && id === myId) return 'You';
  return displayName(profiles[id]);
}

// A conversation's display title: the group name, or the other member(s).
export function conversationTitle(conv, profiles, myId) {
  if (!conv) return '';
  if (conv.is_group) return conv.title || 'Group';
  const other = otherMember(conv, myId);
  return other ? displayName(profiles[other]) : 'Member';
}

// The other person in a 1:1. From direct_key ("<uuid>:<uuid>"), which still
// names them if they've hidden (left) the conversation.
export function otherMember(conv, myId) {
  if (!conv || conv.is_group) return null;
  const ids = conv.direct_key ? conv.direct_key.split(':') : (conv.member_ids || []);
  return ids.find(id => id && id !== myId) || null;
}

export function previewText(conv, profiles, myId) {
  if (!conv?.last_message_id) return conv?.is_group ? 'Group created — say hello' : 'No messages yet';
  const who = conv.last_sender_id === myId
    ? 'You: '
    : conv.is_group ? `${displayName(profiles[conv.last_sender_id]).split(' ')[0]}: ` : '';
  const body = conv.last_deleted ? 'Message deleted' : (conv.last_body || '').replace(/\s+/g, ' ').trim();
  return who + body;
}

// ── Time ───────────────────────────────────────────────────────────────────
// Inbox timestamps: "3:04 PM" today, "Mon" this week, "Sep 3" otherwise.
export function shortTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isToday(d)) return format(d, 'p');
  const days = differenceInCalendarDays(new Date(), d);
  if (days < 7) return format(d, 'EEE');
  return format(d, days < 365 ? 'MMM d' : 'MMM d, yyyy');
}

// Day separators in a conversation.
export function dayLabel(ts) {
  const d = new Date(ts);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, differenceInCalendarDays(new Date(), d) < 365 ? 'EEEE, MMM d' : 'MMM d, yyyy');
}

export function dayKey(ts) {
  return format(new Date(ts), 'yyyy-MM-dd');
}

// Merge message rows by id, keeping oldest → newest order.
export function mergeMessages(prev, incoming) {
  if (!incoming?.length) return prev;
  const byId = new Map(prev.map(m => [m.id, m]));
  incoming.forEach(m => byId.set(m.id, { ...byId.get(m.id), ...m }));
  return [...byId.values()].sort(compareMessages);
}

// Oldest first. Realtime and PostgREST may format timestamps differently, so
// compare as dates, then by id for a stable order.
function compareMessages(a, b) {
  const d = Date.parse(a.created_at) - Date.parse(b.created_at);
  if (d) return d;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
