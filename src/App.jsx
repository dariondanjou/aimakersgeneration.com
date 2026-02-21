import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Bot, LogIn, Github, Twitter, Facebook, MessageSquare, Terminal, Plus, X, Upload } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import Dashboard from './Dashboard';
import ProfilePage from './ProfilePage';

// --- Natural language date parsing utilities ---
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_ABBREVS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function getNextDayOfWeek(targetDay, fromDate) {
  const d = new Date(fromDate);
  const currentDay = d.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  d.setDate(d.getDate() + daysUntil);
  return d;
}

function parseNaturalDate(text) {
  const s = text.toLowerCase().trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (/^today$/.test(s)) return new Date(today);

  if (/^tomorrow$/.test(s)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }

  if (/^day\s+after\s+tomorrow$/.test(s)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d;
  }

  // "next/this/this coming [dayName]"
  const relDay = s.match(/^(?:next|this(?:\s+coming)?)\s+(\w+)$/);
  if (relDay) {
    const dayIdx = DAY_NAMES.indexOf(relDay[1]);
    if (dayIdx !== -1) return getNextDayOfWeek(dayIdx, today);
  }

  // Bare day name: "tuesday"
  const bareDayIdx = DAY_NAMES.indexOf(s);
  if (bareDayIdx !== -1) return getNextDayOfWeek(bareDayIdx, today);

  // "in X days/weeks/months"
  const inM = s.match(/^in\s+(\d+|a|an)\s+(days?|weeks?|months?)$/);
  if (inM) {
    const n = (inM[1] === 'a' || inM[1] === 'an') ? 1 : parseInt(inM[1]);
    const unit = inM[2];
    const d = new Date(today);
    if (unit.startsWith('day')) d.setDate(d.getDate() + n);
    else if (unit.startsWith('week')) d.setDate(d.getDate() + n * 7);
    else if (unit.startsWith('month')) d.setMonth(d.getMonth() + n);
    return d;
  }

  // "Month Day, Year" or "Month Day"
  const monthDayM = s.match(/^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?$/);
  if (monthDayM) {
    let monthIdx = MONTH_NAMES.indexOf(monthDayM[1]);
    if (monthIdx === -1) monthIdx = MONTH_ABBREVS.indexOf(monthDayM[1]);
    const day = parseInt(monthDayM[2]);
    const year = monthDayM[3] ? parseInt(monthDayM[3]) : (new Date(today.getFullYear(), monthIdx, day) >= today ? today.getFullYear() : today.getFullYear() + 1);
    const d = new Date(year, monthIdx, day);
    if (!isNaN(d.getTime())) return d;
  }

  // "end of [month/year]" e.g. "end of december 2026" or "december 2026"
  const endOfM = s.match(/^(?:end\s+of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})$/);
  if (endOfM) {
    let monthIdx = MONTH_NAMES.indexOf(endOfM[1]);
    if (monthIdx === -1) monthIdx = MONTH_ABBREVS.indexOf(endOfM[1]);
    const year = parseInt(endOfM[2]);
    // Last day of that month
    const d = new Date(year, monthIdx + 1, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback: try standard Date parsing
  const fallback = new Date(text.trim());
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

function generateRecurringDates(dayOfWeek, endDate) {
  const dates = [];
  const start = getNextDayOfWeek(dayOfWeek, new Date());
  const current = new Date(start);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return dates;
}

function parseRecurringPattern(text) {
  const m = text.match(/every\s+(\w+?)s?\s+(?:through|until|thru|til|up\s+to)\s+(.+)/i);
  if (!m) return null;
  const dayIdx = DAY_NAMES.indexOf(m[1].toLowerCase());
  if (dayIdx === -1) return null;
  const endDate = parseNaturalDate(m[2]);
  if (!endDate) return null;
  return { dayOfWeek: dayIdx, endDate };
}

function detectIntent(text) {
  const lower = text.toLowerCase();

  // Check for recurring pattern first
  const recurring = parseRecurringPattern(text);
  if (recurring) {
    return { action: 'create', contentType: 'event', recurring };
  }

  // Detect action
  let action = null;
  if (/\b(add|new|create|make|set\s*up|schedule|publish|write)\b/i.test(lower)) action = 'create';
  else if (/\b(edit|update|change|modify|rename|reschedule|move|fix|adjust)\b/i.test(lower)) action = 'edit';
  else if (/\b(delete|remove|drop|get\s+rid\s+of|take\s+down)\b/i.test(lower)) action = 'delete';

  // Detect content type
  let contentType = null;
  if (/\b(event|meetup|gathering|session|happening)\b/i.test(lower) || /\bfilm\s*bar\s*ai\b/i.test(lower)) contentType = 'event';
  else if (/\b(article|post|news|announcement|video|story)\b/i.test(lower)) contentType = 'post';
  else if (/\b(resource|tool|wiki|ai\s+tool)\b/i.test(lower)) contentType = 'resource';
  else if (/\b(profile|username|avatar|bio)\b/i.test(lower)) contentType = 'profile';
  else if (/\b(feedback|suggestion|feature\s+request|critique|contact\s+admin)\b/i.test(lower)) contentType = 'feedback';

  // If content type found but no explicit action, default to create
  if (!action && contentType && !/\b(who|what|when|where|why|how|tell|about|is|are|does|do)\b/i.test(lower)) {
    action = 'create';
  }

  // Extract date from text if it mentions an event
  let extractedDate = null;
  let extractedTime = null;
  if (contentType === 'event') {
    // Try to find a date expression in the text
    const datePatterns = [
      /(?:on|for)\s+((?:next|this(?:\s+coming)?)\s+\w+)/i,
      /(?:on|for)\s+(tomorrow|today)/i,
      /(?:on|for)\s+(\w+\s+\d{1,2}(?:\s*,?\s*\d{4})?)/i,
      /((?:next|this(?:\s+coming)?)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
      /(tomorrow)/i,
    ];
    for (const p of datePatterns) {
      const dm = text.match(p);
      if (dm) {
        const parsed = parseNaturalDate(dm[1]);
        if (parsed) { extractedDate = parsed; break; }
      }
    }
    // Extract time
    const timeM = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:to|-|–)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i)
      || text.match(/\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
    if (timeM) extractedTime = timeM[1].trim();
  }

  return { action, contentType, recurring: null, extractedDate, extractedTime };
}

function ChatWindow({ session, onDataChange }) {
  const loggedOutWelcome = "Hello! I'm the AI Maker Bot.\n\nI can answer general questions about the AI MAKERS GENERATION community.";
  const loggedInWelcome = "Hello! I'm the AI Maker Bot.\n\nI can answer general questions about the AI MAKERS GENERATION community, help you find resources, or guide you on how to contribute to the AI Resources Wiki.\n\nI can also add AI resources, events, and content to the site directly from this chat window. Just tell me what you'd like to do — for example:\n• \"Schedule Film Bar AI for next Tuesday\"\n• \"I want to write an article about AI art\"\n• \"Delete the old meetup event\"\n• \"Create events every Tuesday through December 2026\"\n\nOr type \"help\" for more options!";

  const [messages, setMessages] = useState([{ role: 'bot', text: loggedOutWelcome }]);
  const [hasSetWelcome, setHasSetWelcome] = useState(false);
  const [input, setInput] = useState('');
  const [flow, setFlow] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!hasSetWelcome && session) {
      setMessages([{ role: 'bot', text: loggedInWelcome }]);
      setHasSetWelcome(true);
    } else if (!hasSetWelcome && session === null) {
      // session explicitly resolved to null (not just initial undefined)
    }
  }, [session, hasSetWelcome]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addBotMessage = (...texts) => {
    setMessages(prev => [...prev, ...texts.map(t => ({ role: 'bot', text: t }))]);
  };

  const uploadFileToSupabase = async (file, isAvatar = false) => {
    const fileExt = file.name.split('.').pop();
    const filePath = isAvatar
      ? `${session.user.id}/avatar.${fileExt}`
      : `${session.user.id}/chat/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addBotMessage("File is too large. Max size is 5MB.");
      return;
    }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      addBotMessage("Only image and video files are supported.");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingFile({ file, previewUrl, uploading: false });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const dismissPendingFile = () => {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addBotMessage("File is too large. Max size is 5MB.");
      return;
    }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      addBotMessage("Only image and video files are supported.");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingFile({ file, previewUrl, uploading: false });
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !pendingFile) || isSaving || isUploading) return;

    let imageUrl = null;

    if (pendingFile) {
      if (!session) {
        addBotMessage("You need to be signed in to upload files. Please log in first!");
        return;
      }
      setIsUploading(true);
      setPendingFile(prev => ({ ...prev, uploading: true }));
      try {
        const isAvatar = flow?.type === 'profile' && flow?.step === 3;
        imageUrl = await uploadFileToSupabase(pendingFile.file, isAvatar);
      } catch (err) {
        addBotMessage("Upload failed: " + err.message);
        setIsUploading(false);
        setPendingFile(prev => ({ ...prev, uploading: false }));
        return;
      }
      if (pendingFile.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
      setPendingFile(null);
      setIsUploading(false);
    }

    const displayText = text || (imageUrl ? '(file attached)' : '');
    setMessages(prev => [...prev, { role: 'user', text: displayText, imageUrl }]);
    setInput('');
    processMessage(displayText, imageUrl);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const processMessage = (text, imageUrl = null) => {
    const lower = text.toLowerCase().trim();

    // 1. Cancel active flow
    if (lower === 'cancel' && flow) {
      setFlow(null);
      addBotMessage("Operation cancelled. What else can I help you with?");
      return;
    }

    // 2. Continue active flow
    if (flow) {
      processFlowStep(text, imageUrl);
      return;
    }

    // 3. Detect intent conversationally
    const intent = detectIntent(text);

    // 4. Recurring event creation
    if (intent.recurring && intent.contentType === 'event') {
      if (!session) { addBotMessage("You need to be signed in to create events. Please log in first!"); return; }
      startRecurringEventFlow(text, intent.recurring);
      return;
    }

    // 5. Create actions
    if (intent.action === 'create' && intent.contentType) {
      if (!session) { addBotMessage("You need to be signed in to add content. Please log in first!"); return; }
      switch (intent.contentType) {
        case 'event':
          startSmartEventFlow(text, intent.extractedDate, intent.extractedTime);
          return;
        case 'post':
          setFlow({ type: 'post', step: 0, data: {} });
          addBotMessage("Let's create a new post! What type is it?", "Choose one: announcement, news, or video");
          return;
        case 'resource':
          setFlow({ type: 'resource', step: 0, data: {} });
          addBotMessage("Let's add a new AI resource! What's the title?");
          return;
        case 'profile':
          setFlow({ type: 'profile', step: 0, data: {} });
          addBotMessage("Let's update your profile! What username would you like?");
          return;
        case 'feedback':
          setFlow({ type: 'feedback', step: 0, data: {} });
          addBotMessage("I'd love to hear from you! What would you like to share with the admin team?\n\nYou can send a suggestion, feature request, feedback, critique, or ask a question.");
          return;
      }
    }

    // 6. Edit actions
    if (intent.action === 'edit' && intent.contentType) {
      if (!session) { addBotMessage("You need to be signed in to edit content. Please log in first!"); return; }
      switch (intent.contentType) {
        case 'event': startEditEventFlow(); return;
        case 'post': startEditPostFlow(); return;
        case 'resource': startEditResourceFlow(); return;
        case 'profile':
          setFlow({ type: 'profile', step: 0, data: {} });
          addBotMessage("Let's update your profile! What username would you like?");
          return;
      }
    }

    // 7. Delete actions
    if (intent.action === 'delete' && intent.contentType) {
      if (!session) { addBotMessage("You need to be signed in to delete content. Please log in first!"); return; }
      switch (intent.contentType) {
        case 'event': startDeleteEventFlow(); return;
        case 'post': startDeletePostFlow(); return;
        case 'resource': startDeleteResourceFlow(); return;
      }
    }

    // 8. Knowledge/FAQ responses
    if (/\bhelp\b|what can you do/i.test(text)) {
      if (session) {
        addBotMessage("Here's what I can do — just tell me naturally what you'd like:\n\n• Create events — \"Schedule Film Bar AI for next Tuesday\"\n• Create recurring events — \"Every Tuesday through December 2026\"\n• Add resources — \"Add a new AI tool resource\"\n• Publish articles — \"I want to write an article about AI art\"\n• Edit content — \"Update the Film Bar AI event\"\n• Delete content — \"Remove the old meetup event\"\n• Update your profile — \"Change my bio\"\n• Send feedback — \"I have a suggestion\"\n• \"Cancel\" — Cancel any in-progress action\n\nI understand natural dates like \"next Tuesday\", \"tomorrow\", \"March 15\".\nYou can also attach files using the + button or by dragging and dropping!");
      } else {
        addBotMessage("I can answer general questions about the AI MAKERS GENERATION community.\n\nSign in to add events, resources, articles, and edit your profile!");
      }
    } else if (/\b(who\s+founded|who\s+started|who\s+created|founders?|started\s+by|created\s+by|who\s+made)\b/i.test(text)) {
      addBotMessage("AI Makers Generation was founded by Darion D'Anjou and Gheri Thomas — two working AI creative professionals who started it as a \"reason to get out of the house\" and connect with fellow AI creators.");
    } else if (/\b(film\s*bar\s*ai|filmbar)\b/i.test(text) && !intent.action) {
      addBotMessage("Film Bar AI is a recurring in-person event series under the AI Makers Generation umbrella. It happens every Tuesday from 6–10pm EST at Halidom Eatery in East Atlanta.\n\nYes, it's happening! Film Bar AI runs without fail every Tuesday evening. Come through!");
    } else if (/\b(tuesday|in\s*person|meetup|meet\s*up|irl|halidom|east\s*atlanta)\b/i.test(text) && !intent.action) {
      addBotMessage("Our in-person meetup is Film Bar AI — every Tuesday from 6–10pm EST at Halidom Eatery in East Atlanta. It happens every week without fail. Come hang out with fellow AI creatives!");
    } else if (/\b(what\s+is|about|tell\s+me\s+about|describe)\b.*\b(ai\s*makers|this\s+community|this\s+site|aimakersgeneration)\b/i.test(text)) {
      addBotMessage("AI Makers Generation is a community of AI creatives, builders, and makers founded by Darion D'Anjou and Gheri Thomas. We share resources, catch up on AI news, and collaborate on the future.\n\nOur flagship in-person event is Film Bar AI — every Tuesday from 6–10pm EST at Halidom Eatery in East Atlanta.");
    } else if (/\b(when|where|next\s+event|events?|happening|schedule)\b/i.test(text) && !intent.action) {
      addBotMessage("Film Bar AI happens every Tuesday from 6–10pm EST at Halidom Eatery in East Atlanta — no exceptions!\n\nCheck the Calendar tab for all upcoming community events.");
    } else {
      if (session) {
        addBotMessage("I can help you manage content on the site! Just tell me what you'd like to do — create an event, write an article, add a resource, or anything else. Type \"help\" for examples.\n\nYou can also ask me about AI Makers Generation, Film Bar AI, or our events!");
      } else {
        addBotMessage("I can answer general questions about the AI MAKERS GENERATION community — try asking about Film Bar AI, our founders, or upcoming events.\n\nSign in to unlock more features!");
      }
    }
  };

  const startSmartEventFlow = (text, extractedDate, extractedTime) => {
    const data = {};

    // Try to extract a title from the message (remove action words and date expressions)
    let titleCandidate = text
      .replace(/\b(add|new|create|make|set\s*up|schedule|an?)\b/gi, '')
      .replace(/\b(event|for|on)\b/gi, '')
      .replace(/(next|this\s+coming|this)\s+\w+day/gi, '')
      .replace(/tomorrow|today/gi, '')
      .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:to|-|–)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, '')
      .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, '')
      .replace(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(?:\s*,?\s*\d{4})?\b/gi, '')
      .replace(/\s+/g, ' ').trim();

    if (titleCandidate.length > 2) data.title = titleCandidate;
    if (extractedDate) data.event_date = extractedDate;
    if (extractedTime) data.description = `Time: ${extractedTime}`;

    // If we have both title and date, jump to URL step
    if (data.title && data.event_date) {
      setFlow({ type: 'event', step: 3, data });
      addBotMessage(
        `I'll create an event:\n• Title: ${data.title}\n• Date: ${data.event_date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}${data.description ? `\n• ${data.description}` : ''}`,
        "Is there a URL for this event? (You can also attach a file, or type \"skip\")"
      );
    } else if (data.title) {
      setFlow({ type: 'event', step: 1, data });
      addBotMessage(`Creating event "${data.title}". What's the description? (Type "skip" to leave blank)`);
    } else if (data.event_date) {
      setFlow({ type: 'event', step: 0, data });
      addBotMessage(`Got the date: ${data.event_date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. What's the event title?`);
    } else {
      setFlow({ type: 'event', step: 0, data: {} });
      addBotMessage("Let's create a new event! What's the title?");
    }
  };

  const startRecurringEventFlow = (text, recurring) => {
    const dates = generateRecurringDates(recurring.dayOfWeek, recurring.endDate);
    if (dates.length === 0) {
      addBotMessage("No upcoming dates found for that pattern. Make sure the end date is in the future.");
      return;
    }

    // Try to extract title from the text
    let title = text
      .replace(/every\s+\w+s?\s+(?:through|until|thru|til|up\s+to)\s+.*/i, '')
      .replace(/\b(add|new|create|make|set\s*up|schedule|an?|events?|for)\b/gi, '')
      .replace(/\s+/g, ' ').trim();

    if (title.length < 2) title = '';

    setFlow({ type: 'recurring_event', step: title ? 1 : 0, data: { dates, title, dayName: DAY_NAMES[recurring.dayOfWeek] } });

    if (title) {
      addBotMessage(
        `I'll create ${dates.length} recurring "${title}" events, every ${DAY_NAMES[recurring.dayOfWeek].charAt(0).toUpperCase() + DAY_NAMES[recurring.dayOfWeek].slice(1)} from ${dates[0].toLocaleDateString()} through ${dates[dates.length - 1].toLocaleDateString()}.`,
        "What's the description for these events? (Type \"skip\" to leave blank)"
      );
    } else {
      addBotMessage(`I'll create ${dates.length} events, every ${DAY_NAMES[recurring.dayOfWeek].charAt(0).toUpperCase() + DAY_NAMES[recurring.dayOfWeek].slice(1)} from ${dates[0].toLocaleDateString()} through ${dates[dates.length - 1].toLocaleDateString()}.\n\nWhat's the title for these events?`);
    }
  };

  const processFlowStep = (text, imageUrl = null) => {
    if (flow.type === 'event') processEventStep(text, imageUrl);
    else if (flow.type === 'resource') processResourceStep(text, imageUrl);
    else if (flow.type === 'post') processPostStep(text, imageUrl);
    else if (flow.type === 'profile') processProfileStep(text, imageUrl);
    else if (flow.type === 'feedback') processFeedbackStep(text);
    else if (flow.type === 'edit_event') processEditEventStep(text);
    else if (flow.type === 'edit_post') processEditPostStep(text);
    else if (flow.type === 'edit_resource') processEditResourceStep(text);
    else if (flow.type === 'recurring_event') processRecurringEventStep(text);
    else if (flow.type === 'delete_event') processDeleteEventStep(text);
    else if (flow.type === 'delete_post') processDeletePostStep(text);
    else if (flow.type === 'delete_resource') processDeleteResourceStep(text);
  };

  const processEventStep = (text, imageUrl = null) => {
    const lower = text.toLowerCase().trim();
    const isSkip = lower === 'skip' || lower === 'none';

    switch (flow.step) {
      case 0: {
        setFlow({ ...flow, step: 1, data: { ...flow.data, title: text.trim() } });
        addBotMessage("What's the description? (Type \"skip\" to leave blank)");
        break;
      }
      case 1: {
        const description = isSkip ? '' : text.trim();
        setFlow({ ...flow, step: 2, data: { ...flow.data, description } });
        addBotMessage("When is the event? (e.g., \"next Tuesday\", \"March 15\", \"tomorrow\")");
        break;
      }
      case 2: {
        const date = parseNaturalDate(text.trim());
        if (!date) {
          addBotMessage("I couldn't parse that date. Try something like \"next Tuesday\", \"March 15, 2026\", \"tomorrow\", or \"in 2 weeks\".");
          return;
        }
        setFlow({ ...flow, step: 3, data: { ...flow.data, event_date: date } });
        addBotMessage("Is there a URL for this event? (You can also attach a file using the + button, or type \"skip\")");
        break;
      }
      case 3: {
        const url = imageUrl || (isSkip ? '' : text.trim());
        const data = { ...flow.data, url };
        setFlow({ ...flow, step: 4, data });
        addBotMessage(
          `Here's the event summary:\n\n` +
          `• Title: ${data.title}\n` +
          `• Description: ${data.description || '(none)'}\n` +
          `• Date: ${data.event_date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
          `• URL: ${url || '(none)'}`,
          "Does this look correct? (yes / no)"
        );
        break;
      }
      case 4: {
        if (lower === 'yes' || lower === 'y') {
          doInsertEvent(flow.data);
        } else {
          setFlow(null);
          addBotMessage("Event not added. What else can I help with?");
        }
        break;
      }
    }
  };

  const processResourceStep = (text, imageUrl = null) => {
    const lower = text.toLowerCase().trim();
    const isSkip = lower === 'skip' || lower === 'none';

    switch (flow.step) {
      case 0: {
        setFlow({ ...flow, step: 1, data: { ...flow.data, title: text.trim() } });
        addBotMessage("What's the description or content for this resource?");
        break;
      }
      case 1: {
        setFlow({ ...flow, step: 2, data: { ...flow.data, content: text.trim() } });
        addBotMessage("Is there a URL for this resource? (You can also attach a file using the + button, or type \"skip\")");
        break;
      }
      case 2: {
        const url = imageUrl || (isSkip ? '' : text.trim());
        const data = { ...flow.data, url };
        setFlow({ ...flow, step: 3, data });
        addBotMessage(
          `Here's the resource summary:\n\n` +
          `• Title: ${data.title}\n` +
          `• Content: ${data.content}\n` +
          `• URL: ${url || '(none)'}`,
          "Does this look correct? (yes / no)"
        );
        break;
      }
      case 3: {
        if (lower === 'yes' || lower === 'y') {
          doInsertResource(flow.data);
        } else {
          setFlow(null);
          addBotMessage("Resource not added. What else can I help with?");
        }
        break;
      }
    }
  };

  const processPostStep = (text, imageUrl = null) => {
    const lower = text.toLowerCase().trim();
    const isSkip = lower === 'skip' || lower === 'none';

    switch (flow.step) {
      case 0: {
        const validTypes = ['announcement', 'news', 'video'];
        if (!validTypes.includes(lower)) {
          addBotMessage("Please choose one: announcement, news, or video");
          return;
        }
        setFlow({ ...flow, step: 1, data: { ...flow.data, type: lower } });
        addBotMessage("What's the title?");
        break;
      }
      case 1: {
        setFlow({ ...flow, step: 2, data: { ...flow.data, title: text.trim() } });
        addBotMessage("What's the full content?");
        break;
      }
      case 2: {
        setFlow({ ...flow, step: 3, data: { ...flow.data, content: text.trim() } });
        addBotMessage("Add a short excerpt or summary? (Type \"skip\" to leave blank)");
        break;
      }
      case 3: {
        const excerpt = isSkip ? '' : text.trim();
        const newData = { ...flow.data, excerpt };
        if (flow.data.type === 'video') {
          setFlow({ ...flow, step: 4, data: newData });
          addBotMessage("What's the video URL? (You can also attach a file using the + button)");
        } else {
          setFlow({ ...flow, step: 5, data: newData });
          showPostConfirmation(newData);
        }
        break;
      }
      case 4: {
        const video_url = imageUrl || (isSkip ? '' : text.trim());
        const data = { ...flow.data, video_url };
        setFlow({ ...flow, step: 5, data });
        showPostConfirmation(data);
        break;
      }
      case 5: {
        if (lower === 'yes' || lower === 'y') {
          doInsertPost(flow.data);
        } else {
          setFlow(null);
          addBotMessage("Post not added. What else can I help with?");
        }
        break;
      }
    }
  };

  const showPostConfirmation = (data) => {
    let summary = `Here's the post summary:\n\n` +
      `• Type: ${data.type}\n` +
      `• Title: ${data.title}\n` +
      `• Content: ${data.content}\n` +
      `• Excerpt: ${data.excerpt || '(none)'}`;
    if (data.type === 'video') {
      summary += `\n• Video URL: ${data.video_url || '(none)'}`;
    }
    addBotMessage(summary, "Does this look correct? (yes / no)");
  };

  const processProfileStep = (text, imageUrl = null) => {
    const lower = text.toLowerCase().trim();
    const isSkip = lower === 'skip' || lower === 'none';

    switch (flow.step) {
      case 0: {
        setFlow({ ...flow, step: 1, data: { ...flow.data, username: text.trim() } });
        addBotMessage("What's your first name? (Type \"skip\" to leave blank)");
        break;
      }
      case 1: {
        const first_name = isSkip ? '' : text.trim();
        setFlow({ ...flow, step: 2, data: { ...flow.data, first_name } });
        addBotMessage("What's your last name? (Type \"skip\" to leave blank)");
        break;
      }
      case 2: {
        const last_name = isSkip ? '' : text.trim();
        setFlow({ ...flow, step: 3, data: { ...flow.data, last_name } });
        addBotMessage("Upload an avatar image using the + button, or type \"skip\" to keep your current one.");
        break;
      }
      case 3: {
        const avatar_url = imageUrl || (isSkip ? null : text.trim());
        const data = { ...flow.data, avatar_url };
        setFlow({ ...flow, step: 4, data });
        let summary = `Here's your profile update:\n\n` +
          `• Username: ${data.username}\n` +
          `• First name: ${data.first_name || '(none)'}\n` +
          `• Last name: ${data.last_name || '(none)'}\n` +
          `• Avatar: ${data.avatar_url ? 'Updated' : '(no change)'}`;
        addBotMessage(summary, "Does this look correct? (yes / no)");
        break;
      }
      case 4: {
        if (lower === 'yes' || lower === 'y') {
          doUpsertProfile(flow.data);
        } else {
          setFlow(null);
          addBotMessage("Profile update cancelled. What else can I help with?");
        }
        break;
      }
    }
  };

  const doUpsertProfile = async (data) => {
    setIsSaving(true);
    const upsertData = {
      id: session.user.id,
      username: data.username,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      updated_at: new Date()
    };
    if (data.avatar_url) {
      upsertData.avatar_url = data.avatar_url;
    }
    const { error } = await supabase.from('profiles').upsert(upsertData);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error updating profile: " + error.message);
    } else {
      addBotMessage("Profile updated successfully! Check the People tab.", "What else can I help you with?");
      onDataChange?.();
      sendThankYouEmail('profile', data.username);
    }
  };

  const doInsertEvent = async (data) => {
    setIsSaving(true);
    const { error } = await supabase.from('events').insert([{
      title: data.title,
      description: data.description || null,
      event_date: data.event_date.toISOString().split('T')[0],
      url: data.url || null,
      created_by: session?.user?.id || null
    }]);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error adding event: " + error.message);
    } else {
      addBotMessage("Event added successfully! Check the Calendar tab.", "What else can I help you with?");
      onDataChange?.();
      sendThankYouEmail('event', data.title);
    }
  };

  const doInsertResource = async (data) => {
    setIsSaving(true);
    const { error } = await supabase.from('resources').insert([{
      title: data.title,
      description: data.content,
      url: data.url || null,
      submitted_by: session?.user?.id || null
    }]);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error adding resource: " + error.message);
    } else {
      addBotMessage("Resource added to the wiki! Check the Resources tab.", "What else can I help you with?");
      onDataChange?.();
      sendThankYouEmail('resource', data.title);
    }
  };

  const doInsertPost = async (data) => {
    setIsSaving(true);
    const insertData = {
      title: data.title,
      content: data.content,
      type: data.type,
      excerpt: data.excerpt || null,
      author_id: session?.user?.id || null
    };
    if (data.type === 'video' && data.video_url) {
      insertData.video_url = data.video_url;
    }
    const { error } = await supabase.from('posts').insert([insertData]);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error adding post: " + error.message);
    } else {
      addBotMessage("Post published! Check the AI News tab.", "What else can I help you with?");
      onDataChange?.();
      sendThankYouEmail('post', data.title);
    }
  };

  const startEditEventFlow = async () => {
    setIsSaving(true);
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })
      .limit(10);
    setIsSaving(false);
    if (error) { addBotMessage("Error loading events: " + error.message); return; }
    if (!events || events.length === 0) { addBotMessage("There are no events to edit right now."); return; }
    const list = events.map((e, i) =>
      `${i + 1}. ${e.title} — ${new Date(e.event_date).toLocaleDateString()}`
    ).join('\n');
    setFlow({ type: 'edit_event', step: 0, data: { events } });
    addBotMessage(`Here are the recent events:\n\n${list}`, "Which one would you like to edit? (enter the number)");
  };

  const processEditEventStep = (text) => {
    const lower = text.toLowerCase().trim();
    switch (flow.step) {
      case 0: {
        const num = parseInt(text.trim());
        const events = flow.data.events;
        if (isNaN(num) || num < 1 || num > events.length) {
          addBotMessage(`Please enter a number between 1 and ${events.length}.`);
          return;
        }
        const selected = events[num - 1];
        setFlow({ ...flow, step: 1, data: { ...flow.data, selected } });
        addBotMessage(
          `Current details for "${selected.title}":\n\n` +
          `• Title: ${selected.title}\n` +
          `• Description: ${selected.description || '(none)'}\n` +
          `• Date: ${new Date(selected.event_date).toLocaleDateString()}\n` +
          `• URL: ${selected.url || '(none)'}`,
          "What would you like to change? Describe your updates in plain English.\n\nExamples:\n• \"change the title to AI Workshop\"\n• \"add time 2pm-5pm\"\n• \"update the description to A hands-on workshop\"\n• \"move the date to March 25, 2026\""
        );
        break;
      }
      case 1: {
        const changes = parseEventChanges(text);
        if (Object.keys(changes).length === 0) {
          addBotMessage("I couldn't understand what to change. Try being more specific, e.g.:\n• \"change the title to New Title\"\n• \"add time 2pm to 5pm\"\n• \"update description to New description\"\n• \"change date to April 1, 2026\"\n• \"set url to https://example.com\"");
          return;
        }
        setFlow({ ...flow, step: 2, data: { ...flow.data, changes } });
        const selected = flow.data.selected;
        let summary = `Here's what I'll update on "${selected.title}":\n`;
        if (changes.title) summary += `\n• Title: ${selected.title} → ${changes.title}`;
        if (changes.description !== undefined) summary += `\n• Description → ${changes.description}`;
        if (changes.time) summary += `\n• Time: (adding) ${changes.time}`;
        if (changes.event_date) summary += `\n• Date: ${new Date(selected.event_date).toLocaleDateString()} → ${changes.event_date.toLocaleDateString()}`;
        if (changes.url) summary += `\n• URL → ${changes.url}`;
        addBotMessage(summary, "Does this look correct? (yes / no)");
        break;
      }
      case 2: {
        if (lower === 'yes' || lower === 'y') {
          doUpdateEvent(flow.data.selected, flow.data.changes);
        } else {
          setFlow(null);
          addBotMessage("Edit cancelled. What else can I help with?");
        }
        break;
      }
    }
  };

  const parseEventChanges = (text) => {
    const changes = {};
    const extract = (pattern) => {
      const m = text.match(pattern);
      if (!m) return null;
      return m[1]
        .replace(/\s*,?\s*\band\b\s+(?:change|set|update|add|remove|move|reschedule|make|rename)\b.*/i, '')
        .trim().replace(/^["']|["']$/g, '');
    };
    const title = extract(/(?:change|set|update|rename|make)\s+(?:the\s+)?title\s+(?:to|as)\s+(.+)/i)
      || extract(/\btitle\s*:\s*(.+)/i);
    if (title) changes.title = title;
    const desc = extract(/(?:change|set|update|add|make)\s+(?:the\s+)?description\s+(?:to|as)\s+(.+)/i)
      || extract(/\bdescription\s*:\s*(.+)/i);
    if (desc) changes.description = desc;
    const dateStr = extract(/(?:change|set|update|move|reschedule|make)\s+(?:the\s+)?(?:date|event)\s+(?:to|for)\s+(.+)/i)
      || extract(/(?:move|reschedule)\s+(?:it\s+)?(?:to|for)\s+(.+)/i)
      || extract(/\bdate\s*:\s*(.+)/i);
    if (dateStr) {
      const parsed = parseNaturalDate(dateStr);
      if (parsed) changes.event_date = parsed;
    }
    const timeStr = extract(/(?:add|set|change|update)\s+(?:a\s+)?(?:the\s+)?time(?:\s+range)?(?:\s+to|\s+of|\s+as)?\s+(.+)/i)
      || extract(/\btime\s*:\s*(.+)/i);
    if (timeStr) changes.time = timeStr;
    if (!changes.time) {
      const m = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:to|-)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
      if (m) changes.time = m[1].trim();
    }
    const url = extract(/(?:change|set|update|add|make)\s+(?:the\s+)?(?:url|link)\s+(?:to|as)\s+(.+)/i)
      || extract(/\b(?:url|link)\s*:\s*(.+)/i);
    if (url) changes.url = url;
    return changes;
  };

  const doUpdateEvent = async (event, changes) => {
    setIsSaving(true);
    const updateData = {};
    if (changes.title) updateData.title = changes.title;
    if (changes.description !== undefined) updateData.description = changes.description;
    if (changes.event_date) updateData.event_date = changes.event_date.toISOString().split('T')[0];
    if (changes.url) updateData.url = changes.url;
    if (changes.time) {
      const currentDesc = changes.description !== undefined ? changes.description : (event.description || '');
      updateData.description = currentDesc ? `${currentDesc} | Time: ${changes.time}` : `Time: ${changes.time}`;
    }
    const { error } = await supabase.from('events').update(updateData).eq('id', event.id);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error updating event: " + error.message);
    } else {
      addBotMessage(`Event "${changes.title || event.title}" updated successfully!`, "What else can I help you with?");
      onDataChange?.();
    }
  };

  const startEditPostFlow = async () => {
    setIsSaving(true);
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setIsSaving(false);
    if (error) { addBotMessage("Error loading content: " + error.message); return; }
    if (!posts || posts.length === 0) { addBotMessage("There's no content to edit right now."); return; }
    const list = posts.map((p, i) =>
      `${i + 1}. [${p.type}] ${p.title}`
    ).join('\n');
    setFlow({ type: 'edit_post', step: 0, data: { posts } });
    addBotMessage(`Here's the recent content:\n\n${list}`, "Which one would you like to edit? (enter the number)");
  };

  const processEditPostStep = (text) => {
    const lower = text.toLowerCase().trim();
    switch (flow.step) {
      case 0: {
        const num = parseInt(text.trim());
        const posts = flow.data.posts;
        if (isNaN(num) || num < 1 || num > posts.length) {
          addBotMessage(`Please enter a number between 1 and ${posts.length}.`);
          return;
        }
        const selected = posts[num - 1];
        setFlow({ ...flow, step: 1, data: { ...flow.data, selected } });
        let details = `Current details for "${selected.title}":\n\n` +
          `• Type: ${selected.type}\n` +
          `• Title: ${selected.title}\n` +
          `• Content: ${selected.content?.substring(0, 200) || '(none)'}${(selected.content?.length || 0) > 200 ? '...' : ''}\n` +
          `• Excerpt: ${selected.excerpt || '(none)'}`;
        if (selected.type === 'video') details += `\n• Video URL: ${selected.video_url || '(none)'}`;
        addBotMessage(details, "What would you like to change? Describe your updates in plain English.\n\nExamples:\n• \"change the title to New Title\"\n• \"update the content to New content here\"\n• \"change the excerpt to New summary\"");
        break;
      }
      case 1: {
        const changes = parsePostChanges(text);
        if (Object.keys(changes).length === 0) {
          addBotMessage("I couldn't understand what to change. Try being more specific, e.g.:\n• \"change the title to New Title\"\n• \"update content to New content\"\n• \"change excerpt to New summary\"\n• \"set video url to https://youtube.com/...\"");
          return;
        }
        setFlow({ ...flow, step: 2, data: { ...flow.data, changes } });
        const selected = flow.data.selected;
        let summary = `Here's what I'll update on "${selected.title}":\n`;
        if (changes.title) summary += `\n• Title: ${selected.title} → ${changes.title}`;
        if (changes.content) summary += `\n• Content: (updated)`;
        if (changes.excerpt) summary += `\n• Excerpt → ${changes.excerpt}`;
        if (changes.video_url) summary += `\n• Video URL → ${changes.video_url}`;
        addBotMessage(summary, "Does this look correct? (yes / no)");
        break;
      }
      case 2: {
        if (lower === 'yes' || lower === 'y') {
          doUpdatePost(flow.data.selected, flow.data.changes);
        } else {
          setFlow(null);
          addBotMessage("Edit cancelled. What else can I help with?");
        }
        break;
      }
    }
  };

  const parsePostChanges = (text) => {
    const changes = {};
    const extract = (pattern) => {
      const m = text.match(pattern);
      if (!m) return null;
      return m[1]
        .replace(/\s*,?\s*\band\b\s+(?:change|set|update|add|remove|make|rename)\b.*/i, '')
        .trim().replace(/^["']|["']$/g, '');
    };
    const title = extract(/(?:change|set|update|rename|make)\s+(?:the\s+)?title\s+(?:to|as)\s+(.+)/i)
      || extract(/\btitle\s*:\s*(.+)/i);
    if (title) changes.title = title;
    const content = extract(/(?:change|set|update|replace|make)\s+(?:the\s+)?content\s+(?:to|as|with)\s+(.+)/i)
      || extract(/\bcontent\s*:\s*(.+)/i);
    if (content) changes.content = content;
    const excerpt = extract(/(?:change|set|update|add|make)\s+(?:the\s+)?(?:excerpt|summary)\s+(?:to|as)\s+(.+)/i)
      || extract(/\b(?:excerpt|summary)\s*:\s*(.+)/i);
    if (excerpt) changes.excerpt = excerpt;
    const videoUrl = extract(/(?:change|set|update|add|make)\s+(?:the\s+)?video\s*(?:url|link)\s+(?:to|as)\s+(.+)/i)
      || extract(/\bvideo\s*(?:url|link)\s*:\s*(.+)/i);
    if (videoUrl) changes.video_url = videoUrl;
    return changes;
  };

  const doUpdatePost = async (post, changes) => {
    setIsSaving(true);
    const updateData = {};
    if (changes.title) updateData.title = changes.title;
    if (changes.content) updateData.content = changes.content;
    if (changes.excerpt) updateData.excerpt = changes.excerpt;
    if (changes.video_url) updateData.video_url = changes.video_url;
    const { error } = await supabase.from('posts').update(updateData).eq('id', post.id);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error updating post: " + error.message);
    } else {
      addBotMessage(`"${changes.title || post.title}" updated successfully!`, "What else can I help you with?");
      onDataChange?.();
    }
  };

  // --- Recurring event flow ---
  const processRecurringEventStep = (text) => {
    const lower = text.toLowerCase().trim();
    const isSkip = lower === 'skip' || lower === 'none';

    switch (flow.step) {
      case 0: {
        // Getting title
        setFlow({ ...flow, step: 1, data: { ...flow.data, title: text.trim() } });
        addBotMessage(`Got it — "${text.trim()}". What's the description for these events? (Type "skip" to leave blank)`);
        break;
      }
      case 1: {
        // Getting description
        const description = isSkip ? '' : text.trim();
        const data = { ...flow.data, description };
        setFlow({ ...flow, step: 2, data });
        const dayLabel = data.dayName.charAt(0).toUpperCase() + data.dayName.slice(1);
        const dates = data.dates;
        addBotMessage(
          `Ready to create ${dates.length} "${data.title}" events:\n\n` +
          `• Every ${dayLabel} from ${dates[0].toLocaleDateString()} to ${dates[dates.length - 1].toLocaleDateString()}\n` +
          `• Description: ${description || '(none)'}`,
          "Create all of these? (yes / no)"
        );
        break;
      }
      case 2: {
        if (lower === 'yes' || lower === 'y') {
          doInsertRecurringEvents(flow.data);
        } else {
          setFlow(null);
          addBotMessage("Recurring events cancelled. What else can I help with?");
        }
        break;
      }
    }
  };

  const doInsertRecurringEvents = async (data) => {
    setIsSaving(true);
    const events = data.dates.map(date => ({
      title: data.title,
      description: data.description || null,
      event_date: date.toISOString().split('T')[0],
      created_by: session?.user?.id || null
    }));
    const { error } = await supabase.from('events').insert(events);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error creating recurring events: " + error.message);
    } else {
      addBotMessage(`Created ${events.length} "${data.title}" events! Check the Calendar tab.`, "What else can I help you with?");
      onDataChange?.();
      sendThankYouEmail('event', `${data.title} (${events.length} recurring events)`);
    }
  };

  // --- Edit resource flow ---
  const startEditResourceFlow = async () => {
    setIsSaving(true);
    const { data: resources, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setIsSaving(false);
    if (error) { addBotMessage("Error loading resources: " + error.message); return; }
    if (!resources || resources.length === 0) { addBotMessage("There are no resources to edit right now."); return; }
    const list = resources.map((r, i) =>
      `${i + 1}. ${r.title}`
    ).join('\n');
    setFlow({ type: 'edit_resource', step: 0, data: { resources } });
    addBotMessage(`Here are the recent resources:\n\n${list}`, "Which one would you like to edit? (enter the number)");
  };

  const processEditResourceStep = (text) => {
    const lower = text.toLowerCase().trim();
    switch (flow.step) {
      case 0: {
        const num = parseInt(text.trim());
        const resources = flow.data.resources;
        if (isNaN(num) || num < 1 || num > resources.length) {
          addBotMessage(`Please enter a number between 1 and ${resources.length}.`);
          return;
        }
        const selected = resources[num - 1];
        setFlow({ ...flow, step: 1, data: { ...flow.data, selected } });
        addBotMessage(
          `Current details for "${selected.title}":\n\n` +
          `• Title: ${selected.title}\n` +
          `• Description: ${selected.description || '(none)'}\n` +
          `• URL: ${selected.url || '(none)'}`,
          "What would you like to change? Describe your updates in plain English."
        );
        break;
      }
      case 1: {
        const changes = {};
        const extract = (pattern) => {
          const m = text.match(pattern);
          if (!m) return null;
          return m[1].replace(/\s*,?\s*\band\b\s+(?:change|set|update|add|remove|make|rename)\b.*/i, '').trim().replace(/^["']|["']$/g, '');
        };
        const title = extract(/(?:change|set|update|rename|make)\s+(?:the\s+)?title\s+(?:to|as)\s+(.+)/i) || extract(/\btitle\s*:\s*(.+)/i);
        if (title) changes.title = title;
        const desc = extract(/(?:change|set|update|add|make)\s+(?:the\s+)?description\s+(?:to|as)\s+(.+)/i) || extract(/\bdescription\s*:\s*(.+)/i);
        if (desc) changes.description = desc;
        const url = extract(/(?:change|set|update|add|make)\s+(?:the\s+)?(?:url|link)\s+(?:to|as)\s+(.+)/i) || extract(/\b(?:url|link)\s*:\s*(.+)/i);
        if (url) changes.url = url;
        if (Object.keys(changes).length === 0) {
          addBotMessage("I couldn't understand what to change. Try:\n• \"change the title to New Title\"\n• \"update description to New description\"\n• \"set url to https://example.com\"");
          return;
        }
        setFlow({ ...flow, step: 2, data: { ...flow.data, changes } });
        const selected = flow.data.selected;
        let summary = `Here's what I'll update on "${selected.title}":\n`;
        if (changes.title) summary += `\n• Title: ${selected.title} → ${changes.title}`;
        if (changes.description) summary += `\n• Description → ${changes.description}`;
        if (changes.url) summary += `\n• URL → ${changes.url}`;
        addBotMessage(summary, "Does this look correct? (yes / no)");
        break;
      }
      case 2: {
        if (lower === 'yes' || lower === 'y') {
          doUpdateResource(flow.data.selected, flow.data.changes);
        } else {
          setFlow(null);
          addBotMessage("Edit cancelled. What else can I help with?");
        }
        break;
      }
    }
  };

  const doUpdateResource = async (resource, changes) => {
    setIsSaving(true);
    const updateData = {};
    if (changes.title) updateData.title = changes.title;
    if (changes.description) updateData.description = changes.description;
    if (changes.url) updateData.url = changes.url;
    const { error } = await supabase.from('resources').update(updateData).eq('id', resource.id);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error updating resource: " + error.message);
    } else {
      addBotMessage(`"${changes.title || resource.title}" updated successfully!`, "What else can I help you with?");
      onDataChange?.();
    }
  };

  // --- Delete flows ---
  const startDeleteEventFlow = async () => {
    setIsSaving(true);
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })
      .limit(10);
    setIsSaving(false);
    if (error) { addBotMessage("Error loading events: " + error.message); return; }
    if (!events || events.length === 0) { addBotMessage("There are no events to delete."); return; }
    const list = events.map((e, i) =>
      `${i + 1}. ${e.title} — ${new Date(e.event_date).toLocaleDateString()}`
    ).join('\n');
    setFlow({ type: 'delete_event', step: 0, data: { events } });
    addBotMessage(`Here are the recent events:\n\n${list}`, "Which one would you like to delete? (enter the number)");
  };

  const processDeleteEventStep = (text) => {
    const lower = text.toLowerCase().trim();
    switch (flow.step) {
      case 0: {
        const num = parseInt(text.trim());
        const events = flow.data.events;
        if (isNaN(num) || num < 1 || num > events.length) {
          addBotMessage(`Please enter a number between 1 and ${events.length}.`);
          return;
        }
        const selected = events[num - 1];
        setFlow({ ...flow, step: 1, data: { ...flow.data, selected } });
        addBotMessage(
          `Are you sure you want to delete "${selected.title}" (${new Date(selected.event_date).toLocaleDateString()})?\n\nThis cannot be undone. (yes / no)`
        );
        break;
      }
      case 1: {
        if (lower === 'yes' || lower === 'y') {
          doDeleteEvent(flow.data.selected);
        } else {
          setFlow(null);
          addBotMessage("Delete cancelled. What else can I help with?");
        }
        break;
      }
    }
  };

  const doDeleteEvent = async (event) => {
    setIsSaving(true);
    const { error } = await supabase.from('events').delete().eq('id', event.id);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error deleting event: " + error.message);
    } else {
      addBotMessage(`"${event.title}" has been deleted.`, "What else can I help you with?");
      onDataChange?.();
    }
  };

  const startDeletePostFlow = async () => {
    setIsSaving(true);
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setIsSaving(false);
    if (error) { addBotMessage("Error loading content: " + error.message); return; }
    if (!posts || posts.length === 0) { addBotMessage("There's no content to delete."); return; }
    const list = posts.map((p, i) =>
      `${i + 1}. [${p.type}] ${p.title}`
    ).join('\n');
    setFlow({ type: 'delete_post', step: 0, data: { posts } });
    addBotMessage(`Here's the recent content:\n\n${list}`, "Which one would you like to delete? (enter the number)");
  };

  const processDeletePostStep = (text) => {
    const lower = text.toLowerCase().trim();
    switch (flow.step) {
      case 0: {
        const num = parseInt(text.trim());
        const posts = flow.data.posts;
        if (isNaN(num) || num < 1 || num > posts.length) {
          addBotMessage(`Please enter a number between 1 and ${posts.length}.`);
          return;
        }
        const selected = posts[num - 1];
        setFlow({ ...flow, step: 1, data: { ...flow.data, selected } });
        addBotMessage(
          `Are you sure you want to delete "${selected.title}" (${selected.type})?\n\nThis cannot be undone. (yes / no)`
        );
        break;
      }
      case 1: {
        if (lower === 'yes' || lower === 'y') {
          doDeletePost(flow.data.selected);
        } else {
          setFlow(null);
          addBotMessage("Delete cancelled. What else can I help with?");
        }
        break;
      }
    }
  };

  const doDeletePost = async (post) => {
    setIsSaving(true);
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error deleting post: " + error.message);
    } else {
      addBotMessage(`"${post.title}" has been deleted.`, "What else can I help you with?");
      onDataChange?.();
    }
  };

  const startDeleteResourceFlow = async () => {
    setIsSaving(true);
    const { data: resources, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setIsSaving(false);
    if (error) { addBotMessage("Error loading resources: " + error.message); return; }
    if (!resources || resources.length === 0) { addBotMessage("There are no resources to delete."); return; }
    const list = resources.map((r, i) =>
      `${i + 1}. ${r.title}`
    ).join('\n');
    setFlow({ type: 'delete_resource', step: 0, data: { resources } });
    addBotMessage(`Here are the recent resources:\n\n${list}`, "Which one would you like to delete? (enter the number)");
  };

  const processDeleteResourceStep = (text) => {
    const lower = text.toLowerCase().trim();
    switch (flow.step) {
      case 0: {
        const num = parseInt(text.trim());
        const resources = flow.data.resources;
        if (isNaN(num) || num < 1 || num > resources.length) {
          addBotMessage(`Please enter a number between 1 and ${resources.length}.`);
          return;
        }
        const selected = resources[num - 1];
        setFlow({ ...flow, step: 1, data: { ...flow.data, selected } });
        addBotMessage(
          `Are you sure you want to delete "${selected.title}"?\n\nThis cannot be undone. (yes / no)`
        );
        break;
      }
      case 1: {
        if (lower === 'yes' || lower === 'y') {
          doDeleteResource(flow.data.selected);
        } else {
          setFlow(null);
          addBotMessage("Delete cancelled. What else can I help with?");
        }
        break;
      }
    }
  };

  const doDeleteResource = async (resource) => {
    setIsSaving(true);
    const { error } = await supabase.from('resources').delete().eq('id', resource.id);
    setIsSaving(false);
    setFlow(null);
    if (error) {
      addBotMessage("Error deleting resource: " + error.message);
    } else {
      addBotMessage(`"${resource.title}" has been deleted.`, "What else can I help you with?");
      onDataChange?.();
    }
  };

  const categorizeMessage = (text) => {
    const lower = text.toLowerCase();
    if (/\b(feature|add|implement|wish|could you|would be nice|request)\b/.test(lower)) return 'feature_request';
    if (/\b(suggest|idea|proposal|how about|what if|consider)\b/.test(lower)) return 'suggestion';
    if (/\b(bad|wrong|broken|issue|problem|hate|dislike|poor|terrible|worse)\b/.test(lower)) return 'critique';
    if (/\b(how|what|when|where|why|can i|do you|is there|question|\?)\b/.test(lower)) return 'query';
    return 'feedback';
  };

  const categoryLabels = {
    feature_request: 'Feature Request',
    suggestion: 'Suggestion',
    feedback: 'General Feedback',
    critique: 'Critique',
    query: 'Question / Query',
  };

  const sendThankYouEmail = (contributionType, title) => {
    const email = session?.user?.email;
    if (!email) return;
    supabase.functions.invoke('send-email', {
      body: {
        action: 'contribution_thanks',
        contribution_type: contributionType,
        title: title || '',
        user_email: email,
      },
    }).catch((err) => console.error('Thank-you email error:', err));
  };

  const processFeedbackStep = (text) => {
    const lower = text.toLowerCase().trim();

    switch (flow.step) {
      case 0: {
        const category = categorizeMessage(text);
        setFlow({ ...flow, step: 1, data: { ...flow.data, message: text.trim(), category } });
        addBotMessage(`Got it — I've categorized this as: ${categoryLabels[category]}.\n\nWhat's your email address so we can follow up?`);
        break;
      }
      case 1: {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(text.trim())) {
          addBotMessage("That doesn't look like a valid email. Please enter a valid email address.");
          return;
        }
        const data = { ...flow.data, user_email: text.trim() };
        setFlow({ ...flow, step: 2, data });
        addBotMessage(
          `Here's a summary of your feedback:\n\n` +
          `• Category: ${categoryLabels[data.category]}\n` +
          `• Email: ${data.user_email}\n` +
          `• Message: ${data.message}`,
          "Does this look correct? (yes / no)"
        );
        break;
      }
      case 2: {
        if (lower === 'yes' || lower === 'y') {
          doSendFeedback(flow.data);
        } else {
          setFlow(null);
          addBotMessage("Feedback cancelled. What else can I help with?");
        }
        break;
      }
    }
  };

  const doSendFeedback = async (data) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          action: 'feedback',
          category: data.category,
          message: data.message,
          user_email: data.user_email,
          user_id: session?.user?.id || null,
        },
      });
      setFlow(null);
      setIsSaving(false);
      if (error) {
        addBotMessage("There was an error sending your feedback: " + error.message);
      } else {
        const thankYouMessages = {
          feature_request: "Thank you for your feature request! The admin team will review it.",
          suggestion: "Thank you for your suggestion! We love hearing ideas from the community.",
          feedback: "Thank you for your feedback! It helps us improve.",
          critique: "Thank you for your critique! We take all input seriously.",
          query: "Thank you for your question! We'll get back to you.",
        };
        addBotMessage(
          thankYouMessages[data.category] || "Thank you! Your message has been sent.",
          "A copy has been sent to your email. What else can I help with?"
        );
      }
    } catch (err) {
      setFlow(null);
      setIsSaving(false);
      addBotMessage("Error sending feedback: " + err.message);
    }
  };

  return (
    <div
      className="chat-sidebar p-6 lg:pt-8 bg-black/20 lg:bg-transparent flex flex-col relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-[#B0E0E6]/10 border-2 border-dashed border-[#B0E0E6] rounded-lg flex items-center justify-center backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-[#B0E0E6]">
            <Upload size={32} />
            <span className="text-sm font-bold">Drop file to attach</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-8 chalk-border-bottom pb-4 border-b border-white/10 h-10 mt-[28px]">
        <Bot size={24} className="text-[#B0E0E6]" />
        <h2 className="text-lg font-bold">AI MAKER BOT</h2>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-3 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'bot'
            ? 'glass-panel text-sm whitespace-pre-line'
            : 'text-sm bg-[#B0E0E6]/10 border border-[#B0E0E6]/20 rounded-lg p-3 ml-8 whitespace-pre-line'
          }>
            {msg.imageUrl && (
              <img
                src={msg.imageUrl}
                alt="Attached"
                className="max-w-full max-h-40 rounded mb-2 object-contain border border-white/10"
              />
            )}
            {msg.text}
          </div>
        ))}
        {(isSaving || isUploading) && (
          <div className="glass-panel text-sm text-white/50 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-t-[#B0E0E6] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            {isUploading ? 'Uploading...' : 'Saving...'}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto">
        {pendingFile && (
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-t-lg p-2 mx-0">
            {pendingFile.file.type.startsWith('image/') ? (
              <img src={pendingFile.previewUrl} alt="Preview" className="w-10 h-10 rounded object-cover border border-white/20" />
            ) : (
              <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-xs text-white/50">VID</div>
            )}
            <span className="text-xs text-white/70 truncate flex-1">{pendingFile.file.name}</span>
            <button onClick={dismissPendingFile} className="text-white/40 hover:text-white transition-colors p-1">
              <X size={14} />
            </button>
          </div>
        )}
        <div className={`flex items-center chalk-border bg-black/20 p-1 ${pendingFile ? 'rounded-t-none' : ''}`}>
          {session && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving || isUploading}
                className="p-2 text-white/40 hover:text-[#B0E0E6] transition-colors"
                title="Attach file"
              >
                <Plus size={18} />
              </button>
            </>
          )}
          <input
            type="text"
            placeholder={flow ? "Type your answer..." : "Ask a question..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving || isUploading}
            className="flex-1 bg-transparent border-none outline-none text-white p-2 text-sm placeholder:text-white/30"
          />
          <button onClick={handleSend} disabled={isSaving || isUploading} className="p-2 text-[#B0E0E6] hover:text-white transition-colors">
            <MessageSquare size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 max-w-3xl mx-auto text-center">
      <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-5xl mb-4 relative flex items-center justify-center gap-2 sm:gap-4 leading-tight whitespace-nowrap">
        <Terminal className="text-[#B0E0E6] opacity-80 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14" />
        <span className="text-[#FFFFFF]">AI MAKERS GENERATION</span>
      </h1>

      {/* Top row: Description left half, WhatsApp logo + QR code right half */}
      <div className="flex flex-col md:flex-row items-center gap-6 w-full max-w-2xl relative z-10 mb-6" style={{ marginLeft: '20px' }}>
        {/* Left half: Description */}
        <div className="w-full md:w-1/2 text-left" style={{ marginLeft: '10px' }}>
          <p className="text-base md:text-lg text-[#B0E0E6] leading-relaxed">
            We are a community of AI creatives, builders, and makers getting our hands dirty. Share resources, catch up on news, and collaborate on the future.
          </p>
        </div>

        {/* Right half: WhatsApp logo + QR code side by side */}
        <div className="w-full md:w-1/2 flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-xs uppercase tracking-wider text-white/50">Join us on</span>
            <a href="https://chat.whatsapp.com/GelyV1XoEL9HVnlA9QrxDn" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" title="Join our WhatsApp Group">
              <img src="/logo-whatsapp.png" alt="Join our WhatsApp Group" className="w-24 h-24 opacity-30" />
            </a>
          </div>
          <a href="https://chat.whatsapp.com/GelyV1XoEL9HVnlA9QrxDn" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity shrink-0" title="Join our WhatsApp Group">
            <img src="/qrcode-whatsapp.jpeg" alt="Join our WhatsApp Group" className="w-36 h-36 rounded-lg border border-white/10" />
          </a>
        </div>
      </div>

      {/* Auth buttons centered below */}
      <div className="glass-panel flex flex-col items-center gap-2 w-full max-w-sm relative z-10 p-4">
        <h3 className="text-sm uppercase tracking-wider text-white/50 mb-1">Connect to the Network</h3>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10">
          <LogIn size={18} /> Google Login
        </button>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'twitter', options: { redirectTo: window.location.origin } })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-[#1D9BF0]/10 hover:bg-[#1D9BF0]/20">
          <Twitter size={18} /> Continue with X
        </button>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.origin } })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-[#5865F2]/10 hover:bg-[#5865F2]/20">
          <MessageSquare size={18} /> Continue with Discord
        </button>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10">
          <Github size={18} /> Continue with GitHub
        </button>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: window.location.origin } })} className="btn w-full justify-start border-white/20 hover:border-white/50 bg-[#1877F2]/10 hover:bg-[#1877F2]/20">
          <Facebook size={18} /> Continue with Facebook
        </button>
      </div>

      {/* Floating Placeholders for future graphical assets */}
      <div className="absolute top-[20%] left-[10%] opacity-20 pointer-events-none transform -rotate-12">
        <div className="w-16 h-16 border border-dashed border-white/30 rounded flex items-center justify-center text-xs">Midjourney</div>
      </div>
      <div className="absolute bottom-[20%] right-[35%] opacity-20 pointer-events-none transform rotate-12">
        <div className="w-20 h-20 border border-dotted border-white/30 rounded-full flex items-center justify-center text-xs text-center p-2">ChatGPT</div>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleDataChange = () => setRefreshKey(k => k + 1);

  return (
    <Router>
      <div className="app-container">
        <main className="main-content">
          <Routes>
            <Route path="/" element={session ? <Dashboard session={session} refreshKey={refreshKey} /> : <LandingPage />} />
            <Route path="/profile/:id" element={session ? <ProfilePage session={session} /> : <LandingPage />} />
          </Routes>
        </main>

        {/* Right Half: Chat Window */}
        <ChatWindow session={session} onDataChange={handleDataChange} />
      </div>
    </Router>
  );
}

export default App;
