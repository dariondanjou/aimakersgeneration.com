import { Globe, Calendar, Users, Newspaper, Search, LogOut, Edit, Plus, X, Check, Menu, Terminal, MessageCircle, Share2, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { getSocialPlatform, getSocialTooltip } from './socialPlatforms';
import { useState, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Fuse from 'fuse.js';

export default function Dashboard({ session, refreshKey }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('home');
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Profile Edit State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editUsername, setEditUsername] = useState('');
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editAvatarUrl, setEditAvatarUrl] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editLinks, setEditLinks] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    // Comments State
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [commentTarget, setCommentTarget] = useState(null); // { type: 'resource'|'event'|'post', id: '...' }
    const [isSavingComment, setIsSavingComment] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentText, setEditCommentText] = useState('');

    // Search results visibility
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Event Create State
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventDate, setEventDate] = useState(new Date());
    const [isSavingEvent, setIsSavingEvent] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Data States
    const [users, setUsers] = useState([]);
    const [resources, setResources] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [events, setEvents] = useState([]);
    const [newsArticles, setNewsArticles] = useState([]);
    const [youtubeVideos, setYoutubeVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboardData() {
            setLoading(true);

            // Fetch latest 3 announcements
            const { data: postsData } = await supabase
                .from('posts')
                .select(`id, title, excerpt, created_at, profiles(username)`)
                .eq('type', 'announcement')
                .order('created_at', { ascending: false })
                .limit(3);
            if (postsData) setAnnouncements(postsData);

            // Fetch resources (all for wiki, top 5 shown on home)
            const { data: resourcesData } = await supabase
                .from('resources')
                .select('id, title, url, description')
                .order('created_at', { ascending: false })
                .limit(50);
            if (resourcesData) setResources(resourcesData);

            // Fetch future events (including today)
            const today = new Date().toISOString().split('T')[0];
            const { data: eventsData } = await supabase
                .from('events')
                .select('*')
                .gte('event_date', today)
                .order('event_date', { ascending: true })
                .limit(50);
            if (eventsData) setEvents(eventsData);

            // Fetch newest users (up to 50 for the People tab)
            const { data: usersData } = await supabase
                .from('profiles')
                .select('id, username, first_name, last_name, avatar_url, bio, links, title, updated_at')
                .order('updated_at', { ascending: false })
                .limit(50);
            if (usersData) setUsers(usersData);

            // Fetch AI news articles from database
            const { data: newsData } = await supabase
                .from('news_articles')
                .select('id, title, url, source, published_at')
                .order('published_at', { ascending: false })
                .limit(20);
            if (newsData) setNewsArticles(newsData);

            // Fetch YouTube videos from database
            const { data: videosData } = await supabase
                .from('youtube_videos')
                .select('video_id, title, channel_name, thumbnail_url, published_at')
                .order('published_at', { ascending: false })
                .limit(20);
            if (videosData) setYoutubeVideos(videosData);

            setLoading(false);
        }

        fetchDashboardData();
    }, [refreshKey]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    const handleEditProfileSave = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: session.user.id,
                username: editUsername,
                first_name: editFirstName,
                last_name: editLastName,
                avatar_url: editAvatarUrl,
                bio: editBio || null,
                links: editLinks || null,
                title: editTitle || 'AI Creative',
                updated_at: new Date()
            });

        if (!error) {
            // Re-fetch users
            const { data } = await supabase.from('profiles').select('id, username, first_name, last_name, avatar_url, bio, links, title, updated_at').order('updated_at', { ascending: false }).limit(50);
            if (data) setUsers(data);
            setIsEditingProfile(false);
        } else {
            alert('Error saving profile: ' + error.message);
        }
        setIsSavingProfile(false);
    };

    const handleAvatarUpload = async (e) => {
        let file;

        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            e.preventDefault();
            file = e.dataTransfer.files[0];
        } else if (e.target && e.target.files && e.target.files.length > 0) {
            file = e.target.files[0];
        }

        if (!file) return;

        // Prevent huge files explicitly for now
        if (file.size > 5 * 1024 * 1024) {
            alert('File is too large. Max size is 5MB.');
            return;
        }

        setIsUploadingAvatar(true);

        // Use user ID to ensure unique file paths and overwrite old avatars to save space
        const fileExt = file.name.split('.').pop();
        const filePath = `${session.user.id}/avatar.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

            if (data && data.publicUrl) {
                // Instantly update the preview field with the new remote URL
                setEditAvatarUrl(data.publicUrl);
            }
        } catch (error) {
            alert('Error uploading avatar: ' + error.message);
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleAddEventSave = async (e) => {
        e.preventDefault();
        setIsSavingEvent(true);
        const isoDate = eventDate.toISOString().split('T')[0]; // Format for Supabase DATE column
        const { error } = await supabase
            .from('events')
            .insert([{ title: eventTitle, description: eventDescription, event_date: isoDate }]);

        if (!error) {
            // Re-fetch future events (including today)
            const refetchToday = new Date().toISOString().split('T')[0];
            const { data } = await supabase.from('events').select('*').gte('event_date', refetchToday).order('event_date', { ascending: true }).limit(50);
            if (data) setEvents(data);
            setIsAddingEvent(false);
            setEventTitle(''); setEventDescription(''); setEventDate(new Date());
        } else {
            alert('Error adding event: ' + error.message);
        }
        setIsSavingEvent(false);
    };

    // ── Fuzzy Search ──
    const searchIndex = useMemo(() => {
        const items = [];
        newsArticles.forEach(f => items.push({ type: 'news', id: f.id, title: f.title, description: f.source || '', tab: 'news' }));
        youtubeVideos.forEach(v => items.push({ type: 'video', id: v.video_id, title: v.title, description: v.channel_name, tab: 'news' }));
        resources.forEach(r => items.push({ type: 'resource', id: r.id, title: r.title, description: r.description || '', tab: 'resources' }));
        events.forEach(e => items.push({ type: 'event', id: e.id, title: e.title, description: e.description || '', tab: 'calendar' }));
        users.forEach(u => items.push({ type: 'person', id: u.id, title: u.username || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Anonymous', description: u.bio || '', tab: 'people' }));
        return new Fuse(items, { keys: ['title', 'description'], threshold: 0.4, includeScore: true });
    }, [resources, events, users]);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return searchIndex.search(searchQuery.trim()).slice(0, 12);
    }, [searchQuery, searchIndex]);

    const handleSearchSelect = (result) => {
        setActiveTab(result.item.tab);
        setSearchQuery('');
        setShowSearchResults(false);
    };

    // ── Comments ──
    const fetchComments = async (targetType, targetId) => {
        const { data } = await supabase
            .from('comments')
            .select('id, content, created_at, user_id, profiles(username, avatar_url)')
            .eq('target_type', targetType)
            .eq('target_id', targetId)
            .order('created_at', { ascending: true });
        if (data) setComments(data);
    };

    const openComments = (targetType, targetId) => {
        setCommentTarget({ type: targetType, id: targetId });
        setCommentText('');
        setEditingCommentId(null);
        fetchComments(targetType, targetId);
    };

    const closeComments = () => {
        setCommentTarget(null);
        setComments([]);
    };

    const handleAddComment = async () => {
        if (!commentText.trim() || !commentTarget) return;
        setIsSavingComment(true);
        const { error } = await supabase.from('comments').insert([{
            target_type: commentTarget.type,
            target_id: commentTarget.id,
            user_id: session.user.id,
            content: commentText.trim()
        }]);
        if (!error) {
            setCommentText('');
            fetchComments(commentTarget.type, commentTarget.id);
        }
        setIsSavingComment(false);
    };

    const handleEditComment = async (commentId) => {
        if (!editCommentText.trim()) return;
        const { error } = await supabase.from('comments').update({ content: editCommentText.trim() }).eq('id', commentId).eq('user_id', session.user.id);
        if (!error) {
            setEditingCommentId(null);
            setEditCommentText('');
            fetchComments(commentTarget.type, commentTarget.id);
        }
    };

    const handleDeleteComment = async (commentId) => {
        const { error } = await supabase.from('comments').delete().eq('id', commentId).eq('user_id', session.user.id);
        if (!error) fetchComments(commentTarget.type, commentTarget.id);
    };

    const handleShare = (title, url) => {
        const shareUrl = url || window.location.href;
        const text = `Check out "${title}" on AI Makers Generation`;
        if (navigator.share) {
            navigator.share({ title, text, url: shareUrl }).catch(() => {});
        } else {
            navigator.clipboard.writeText(`${text}: ${shareUrl}`);
            alert('Link copied to clipboard!');
        }
    };

    // Comment inline component
    const CommentButton = ({ targetType, targetId }) => (
        <button onClick={() => openComments(targetType, targetId)} className="text-white/40 hover:text-[#B0E0E6] transition-colors p-1" title="Comments">
            <MessageCircle size={14} />
        </button>
    );

    const ShareButton = ({ title, url }) => (
        <button onClick={() => handleShare(title, url)} className="text-white/40 hover:text-[#B0E0E6] transition-colors p-1" title="Share">
            <Share2 size={14} />
        </button>
    );

    return (
        <div className="main-content custom-scrollbar flex flex-col h-full p-6 relative overflow-y-auto text-lg w-full">

            {/* Top Navigation & Search */}
            <header className="flex flex-row items-center mb-8 border-b border-white/10 pb-4 relative z-10 w-full flex-nowrap lg:gap-4 xl:gap-6" style={{ marginTop: '-4px' }}>

                {/* Top Row: Title, Burger (Mobile), Sign Out (Mobile) */}
                <div className="flex justify-between items-center shrink-0 w-full lg:w-auto h-10">
                    {/* Site Title */}
                    <div className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity h-10 mr-2 lg:mr-4 shrink-0" onClick={() => { setActiveTab('home'); setIsMobileMenuOpen(false); }}>
                        <Terminal size={24} className="text-[#B0E0E6] shrink-0" />
                        <span className="text-lg md:text-xl font-bold text-white whitespace-nowrap shrink-0">AI MAKERS GENERATION</span>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 lg:hidden ml-auto shrink-0">
                        {/* Burger Menu Toggle */}
                        <button className="p-2 text-white hover:bg-white/10 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        {/* Mobile Sign Out (Right aligned) */}
                        <button onClick={handleSignOut} className="p-2 text-white/60 hover:text-white bg-white/5 rounded-full hover:bg-white/10 transition-colors flex justify-center items-center" title="Sign Out">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* Nav Links (Desktop Only, Inline) */}
                <div className={`${isMobileMenuOpen ? 'flex flex-col absolute top-16 left-0 right-0 bg-[#0f1419] p-4 border border-white/10 z-50 rounded-lg shadow-xl' : 'hidden'} lg:flex lg:flex-row items-center gap-2 xl:gap-6 shrink overflow-hidden lg:h-10`}>
                    <button onClick={() => { setActiveTab('news'); setIsMobileMenuOpen(false); }} title="AI News" className={`h-10 flex items-center gap-2 px-1 lg:px-3 text-sm font-semibold transition-all border-l-2 lg:border-l-0 lg:border-b-2 text-left shrink-0 ${activeTab === 'news' ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/80'} whitespace-nowrap`}>
                        <Newspaper size={18} /> <span className="block lg:hidden xl:block">AI News</span>
                    </button>
                    <button onClick={() => { setActiveTab('resources'); setIsMobileMenuOpen(false); }} title="AI Resources" className={`h-10 flex items-center gap-2 px-1 lg:px-3 text-sm font-semibold transition-all border-l-2 lg:border-l-0 lg:border-b-2 text-left shrink-0 ${activeTab === 'resources' ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/80'} whitespace-nowrap`}>
                        <Globe size={18} /> <span className="block lg:hidden xl:block">AI Resources</span>
                    </button>
                    <button onClick={() => { setActiveTab('calendar'); setIsMobileMenuOpen(false); }} title="Calendar" className={`h-10 flex items-center gap-2 px-1 lg:px-3 text-sm font-semibold transition-all border-l-2 lg:border-l-0 lg:border-b-2 text-left shrink-0 ${activeTab === 'calendar' ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/80'} whitespace-nowrap`}>
                        <Calendar size={18} /> <span className="block lg:hidden">Calendar</span>
                    </button>
                    <button onClick={() => { setActiveTab('people'); setIsMobileMenuOpen(false); }} title="People" className={`h-10 flex items-center gap-2 px-1 lg:px-3 text-sm font-semibold transition-all border-l-2 lg:border-l-0 lg:border-b-2 text-left shrink-0 ${activeTab === 'people' ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/80'} whitespace-nowrap`}>
                        <Users size={18} /> <span className="block lg:hidden">People</span>
                    </button>
                </div>

                {/* Desktop Search & Sign Out */}
                <div className="hidden lg:flex items-center shrink-0 h-10 ml-auto">
                    <div className="relative mr-2 lg:mr-4 shrink w-[120px] lg:w-40 xl:w-56">
                        <Search className="absolute left-2 lg:left-3 top-1/2 -translate-y-1/2 text-white/50" size={16} />
                        <input
                            type="text"
                            placeholder="Search this site..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                            onFocus={() => setShowSearchResults(true)}
                            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                            className="bg-transparent border-b border-white/20 py-2 pl-8 lg:pl-10 pr-2 lg:pr-4 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#B0E0E6] transition-colors w-full"
                        />
                        {showSearchResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-[#0f1419] border border-white/20 rounded-b-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                                {searchResults.map((r, i) => (
                                    <button key={i} onClick={() => handleSearchSelect(r)} className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0">
                                        <div className="text-sm font-semibold text-white truncate">{r.item.title}</div>
                                        <div className="text-[10px] text-white/40 uppercase">{r.item.type} • {r.item.tab}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={handleSignOut} className="p-2 text-white/60 hover:text-white bg-white/5 rounded-full hover:bg-white/10 transition-colors flex justify-center items-center shrink-0" title="Sign Out">
                        <LogOut size={18} />
                    </button>
                </div>

                {/* Mobile Search (Inside Burger Menu Flow or Below Title) */}
                <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} lg:hidden w-full mt-4`}>
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={16} />
                        <input
                            type="text"
                            placeholder="Search this site..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                            onFocus={() => setShowSearchResults(true)}
                            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                            className="bg-transparent border-b border-white/20 py-2 pl-10 pr-4 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#B0E0E6] transition-colors w-full"
                        />
                        {showSearchResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-[#0f1419] border border-white/20 rounded-b-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                                {searchResults.map((r, i) => (
                                    <button key={i} onClick={() => { handleSearchSelect(r); setIsMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0">
                                        <div className="text-sm font-semibold text-white truncate">{r.item.title}</div>
                                        <div className="text-[10px] text-white/40 uppercase">{r.item.type} • {r.item.tab}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </header>

            {/* Main Content Area Based on Tab */}
            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar relative z-10">
                {activeTab === 'home' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="col-span-1 lg:col-span-8 flex flex-col gap-6">
                            <div className="glass-panel relative overflow-hidden min-h-[200px]">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><Newspaper size={64} /></div>
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                    <h2 className="text-lg font-bold text-white">Latest AI News</h2>
                                    <button onClick={() => setActiveTab('news')} className="text-sm text-white hover:text-[#B0E0E6] transition-colors cursor-pointer">view more</button>
                                </div>

                                <div className="space-y-2 relative z-10">
                                    {newsArticles.slice(0, 3).map(item => (
                                        <div key={item.id} className="border-b border-white/10 pb-2 last:border-0">
                                            <a href={item.url} target="_blank" rel="noreferrer" className="font-bold text-lg text-[#B0E0E6] hover:text-white transition-colors leading-tight">{item.title}</a>
                                            <div className="flex items-center justify-between mt-1">
                                                <div className="text-xs text-white/40">{new Date(item.published_at).toLocaleDateString()} • {item.source}</div>
                                                <div className="flex items-center gap-1">
                                                    <ShareButton title={item.title} url={item.url} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {youtubeVideos.length > 0 && (
                                        <a href={`https://www.youtube.com/watch?v=${youtubeVideos[0].video_id}`} target="_blank" rel="noreferrer" className="block group border-b border-white/10 pb-3">
                                            <div className="relative rounded-lg overflow-hidden border border-white/10 group-hover:border-[#B0E0E6]/50 transition-colors">
                                                <img src={`https://img.youtube.com/vi/${youtubeVideos[0].video_id}/mqdefault.jpg`} alt={youtubeVideos[0].title} className="w-full aspect-video object-cover" />
                                                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                    <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center">
                                                        <div className="w-0 h-0 border-l-[14px] border-l-white border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1" />
                                                    </div>
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-lg text-white group-hover:text-[#B0E0E6] transition-colors mt-2">{youtubeVideos[0].title}</h4>
                                            <div className="text-xs text-white/40 mt-1">{youtubeVideos[0].channel_name} • {new Date(youtubeVideos[0].published_at).toLocaleDateString()}</div>
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="glass-panel p-6">
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                    <h2 className="text-lg font-bold">Active AI Resources</h2>
                                    <button onClick={() => setActiveTab('resources')} className="text-sm text-white hover:text-[#B0E0E6] transition-colors cursor-pointer">view more</button>
                                </div>
                                {loading ? <p className="text-white/50">Loading resources...</p> :
                                    resources.length === 0 ? <p className="text-white/50 italic">No resources added to the wiki yet.</p> :
                                        <ul className="space-y-3">
                                            {resources.slice(0, 5).map(res => (
                                                <li key={res.id} className="flex flex-col p-3 border-b border-white/10 last:border-0">
                                                    <a href={res.url} target="_blank" rel="noreferrer" className="font-semibold text-white hover:text-[#B0E0E6] transition-colors">{res.title}</a>
                                                    {res.description && <span className="text-xs text-white/60 mt-1 line-clamp-2">{res.description}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                }
                            </div>
                        </div>

                        <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">
                            <div className="glass-panel p-6">
                                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                                    <h2 className="text-lg font-bold">Upcoming Events</h2>
                                    <button onClick={() => setActiveTab('calendar')} className="text-sm text-white hover:text-[#B0E0E6] transition-colors">full calendar</button>
                                </div>
                                {loading ? <p className="text-white/50 text-sm">Loading events...</p> :
                                    events.length === 0 ? <p className="text-white/50 italic text-sm">No upcoming events scheduled.</p> :
                                        <ul className="space-y-1">
                                            {events.slice(0, 4).map(ev => (
                                                <li key={ev.id} onClick={() => setSelectedEvent(ev)} className="cursor-pointer hover:bg-white/5 p-2 rounded transition-colors -mx-2">
                                                    <div className="font-bold text-sm">{ev.title}</div>
                                                    <div className="text-sm text-white/60">{new Date(ev.event_date + 'T00:00:00').toLocaleDateString()}</div>
                                                </li>
                                            ))}
                                        </ul>
                                }
                            </div>

                            <div className="glass-panel p-6">
                                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                                    <h2 className="text-lg font-bold text-white">Recently Active</h2>
                                    <button onClick={() => setActiveTab('people')} className="text-sm text-white hover:text-[#B0E0E6] transition-colors">all creatives</button>
                                </div>
                                {loading ? <p className="text-white/50 text-sm">Loading network...</p> :
                                    users.length === 0 ? <p className="text-white/50 italic text-sm">No users yet.</p> :
                                    <div className="space-y-3">
                                        {users.slice(0, 3).map(u => (
                                            <div key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setActiveTab('people')}>
                                                <div className="w-10 h-10 rounded-full bg-black/40 border border-[#B0E0E6]/40 flex items-center justify-center text-sm font-bold shadow-lg overflow-hidden shrink-0">
                                                    {u.avatar_url ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" /> : (u.username?.[0]?.toUpperCase() || '?')}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-white truncate">{u.username || 'Anonymous'}</div>
                                                    <div className="text-[10px] text-white/40">{u.updated_at ? `Active ${new Date(u.updated_at).toLocaleDateString()}` : 'Member'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                )}

                {
                    activeTab === 'news' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-3xl font-bold text-white">AI News</h2>
                                <button className="btn btn-primary text-sm">Submit News</button>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                <div className="col-span-1 lg:col-span-8 flex flex-col gap-4">
                                    {newsArticles.length === 0 && !loading && <p className="text-white/50 italic glass-panel p-6">No news articles yet. Content updates automatically.</p>}
                                    {newsArticles.map(article => (
                                        <div key={article.id} className="glass-panel p-6 border-l-4 border-[#B0E0E6]">
                                            <a href={article.url} target="_blank" rel="noreferrer" className="block text-xl font-bold mb-2 text-[#B0E0E6] hover:text-white transition-colors">
                                                {article.title}
                                            </a>
                                            <div className="flex justify-between items-center text-xs text-white/40 border-t border-white/10 pt-3">
                                                <span>{article.source} • {new Date(article.published_at).toLocaleDateString()}</span>
                                                <div className="flex items-center gap-1">
                                                    <CommentButton targetType="post" targetId={`news-${article.id}`} />
                                                    <ShareButton title={article.title} url={article.url} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="col-span-1 lg:col-span-4 flex flex-col gap-4">
                                    <h3 className="text-xl font-bold border-b border-white/10 pb-2">Latest Videos</h3>
                                    {youtubeVideos.length === 0 && !loading && <p className="text-white/50 italic text-sm">No videos yet. Content updates automatically.</p>}
                                    {youtubeVideos.map(video => (
                                        <a key={video.video_id} href={`https://www.youtube.com/watch?v=${video.video_id}`} target="_blank" rel="noreferrer" className="block group">
                                            <div className="relative rounded-lg overflow-hidden border border-white/10 group-hover:border-[#B0E0E6]/50 transition-colors">
                                                <img
                                                    src={video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
                                                    alt={video.title}
                                                    className="w-full aspect-video object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                    <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center">
                                                        <div className="w-0 h-0 border-l-[14px] border-l-white border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1" />
                                                    </div>
                                                </div>
                                            </div>
                                            <h4 className="text-sm font-semibold text-white group-hover:text-[#B0E0E6] transition-colors mt-2 line-clamp-2">{video.title}</h4>
                                            <span className="text-[10px] text-white/40 uppercase tracking-wider">{video.channel_name} • {new Date(video.published_at).toLocaleDateString()}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'resources' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-3xl font-bold text-white">Resources Wiki</h2>
                                <button className="btn btn-primary text-sm">+ Add Resource</button>
                            </div>

                            <div className="glass-panel p-6">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/20 text-white/50 text-sm">
                                                <th className="pb-3 pt-2 px-4 font-normal">Resource Title</th>
                                                <th className="pb-3 pt-2 px-4 font-normal">Description</th>
                                                <th className="pb-3 pt-2 px-4 font-normal">Link</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? <tr><td colSpan="3" className="text-center py-4">Loading...</td></tr> :
                                                resources.length === 0 ? <tr><td colSpan="3" className="text-center py-8 italic text-white/50">Wiki contains no entries yet.</td></tr> :
                                                    resources.map(res => (
                                                        <tr key={res.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="py-3 px-4 font-semibold">{res.title}</td>
                                                            <td className="py-3 px-4 text-white/60 text-sm max-w-[300px]">{res.description || ''}</td>
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-2">
                                                                    <a href={res.url} className="text-[#B0E0E6] hover:underline truncate inline-block max-w-[150px]" target="_blank" rel="noreferrer">Visit</a>
                                                                    <CommentButton targetType="resource" targetId={res.id} />
                                                                    <ShareButton title={res.title} url={res.url} />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'calendar' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-3xl font-bold text-white">Project Deadlines & Events</h2>
                                {!isAddingEvent && (
                                    <button onClick={() => setIsAddingEvent(true)} className="btn btn-primary text-sm">
                                        <Plus size={16} className="inline mr-2" /> Add Event
                                    </button>
                                )}
                            </div>

                            {isAddingEvent && (
                                <div className="glass-panel p-6 border border-[#B0E0E6]/50 mb-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-bold">Create New Event</h3>
                                        <button onClick={() => setIsAddingEvent(false)} className="text-white/50 hover:text-white"><X size={20} /></button>
                                    </div>
                                    <form onSubmit={handleAddEventSave} className="flex flex-col gap-4 max-w-md">
                                        <div>
                                            <label className="block text-sm text-white/70 mb-1">Event Title</label>
                                            <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded py-2 px-3 text-white focus:outline-none focus:border-[#B0E0E6] transition-colors" placeholder="e.g. Hackathon Kickoff" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-white/70 mb-1">Description (Optional)</label>
                                            <textarea value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded py-2 px-3 text-white focus:outline-none focus:border-[#B0E0E6] transition-colors h-24" placeholder="Event details..." />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-white/70 mb-1">Date</label>
                                            <div className="custom-datepicker-wrapper">
                                                <DatePicker
                                                    selected={eventDate}
                                                    onChange={(date) => setEventDate(date)}
                                                    className="w-full bg-black/40 border border-white/20 rounded py-2 px-3 text-white focus:outline-none focus:border-[#B0E0E6] transition-colors"
                                                    dateFormat="MMMM d, yyyy"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <button type="submit" disabled={isSavingEvent} className="btn btn-primary w-fit mt-2">
                                            {isSavingEvent ? 'Saving...' : <><Check size={16} className="inline mr-2" /> Save Event</>}
                                        </button>
                                    </form>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {loading ? <p>Loading calendar...</p> :
                                    events.length === 0 ? <div className="col-span-full glass-panel py-12 text-center text-white/50 italic">No events mapped.</div> :
                                        events.map(ev => (
                                            <div key={ev.id} className="glass-panel border-[#FFFFFF]/30 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden group hover:border-[#FFFFFF] transition-colors">
                                                <Calendar size={48} className="text-white/10 absolute -right-4 -bottom-4 group-hover:text-white/20 transition-colors" />
                                                <div className="cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                                                    <div className="text-[#FFFFFF] text-2xl font-bold mb-2">{new Date(ev.event_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                                    <h3 className="text-lg font-bold z-10">{ev.title}</h3>
                                                    {ev.description && <p className="text-sm text-white/60 mt-2 z-10 line-clamp-2">{ev.description}</p>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-3 z-10">
                                                    <CommentButton targetType="event" targetId={ev.id} />
                                                    <ShareButton title={ev.title} />
                                                </div>
                                            </div>
                                        ))
                                }
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'people' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-3xl font-bold text-white">AI Creatives</h2>
                                {!isEditingProfile && (
                                    <button onClick={() => {
                                        const myProfile = users.find(u => u.id === session.user.id);
                                        if (myProfile) {
                                            setEditUsername(myProfile.username || '');
                                            setEditFirstName(myProfile.first_name || '');
                                            setEditLastName(myProfile.last_name || '');
                                            setEditAvatarUrl(myProfile.avatar_url || '');
                                            setEditBio(myProfile.bio || '');
                                            setEditLinks(myProfile.links || '');
                                            setEditTitle(myProfile.title || 'AI Creative');
                                        }
                                        setIsEditingProfile(true);
                                    }} className="btn btn-primary text-sm">
                                        <Edit size={16} className="inline mr-2" /> Edit My Profile
                                    </button>
                                )}
                            </div>

                            {isEditingProfile && (
                                <div className="glass-panel p-6 border border-[#B0E0E6]/50 mb-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-bold">Edit Your Profile</h3>
                                        <button onClick={() => setIsEditingProfile(false)} className="text-white/50 hover:text-white"><X size={20} /></button>
                                    </div>
                                    <form onSubmit={handleEditProfileSave} className="flex flex-col gap-4 max-w-md">
                                        <div>
                                            <label className="block text-sm text-white/70 mb-1">Avatar Image</label>
                                            <div
                                                className={`w-full border-2 border-dashed ${isUploadingAvatar ? 'border-[#B0E0E6] scale-95' : 'border-white/30 hover:border-white/60'} rounded-lg p-6 text-center transition-all cursor-pointer relative overflow-hidden`}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={handleAvatarUpload}
                                            >
                                                {isUploadingAvatar ? (
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="w-8 h-8 border-4 border-t-[#B0E0E6] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-2" />
                                                        <span className="text-sm text-white/70">Uploading...</span>
                                                    </div>
                                                ) : editAvatarUrl ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <img src={editAvatarUrl} alt="Avatar Preview" className="w-16 h-16 rounded-full object-cover border border-white/20 shadow-lg" />
                                                        <span className="text-xs text-[#B0E0E6]">Click or Drop to Re-Upload</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-white/70 text-sm font-bold">Drag & Drop Image Here</span>
                                                        <span className="text-white/40 text-xs">or click to browse local files (Max 5MB)</span>
                                                    </div>
                                                )}

                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={handleAvatarUpload}
                                                    disabled={isUploadingAvatar}
                                                />
                                            </div>
                                            {editAvatarUrl && (
                                                <div className="mt-2 text-xs flex justify-between items-center text-white/40">
                                                    <span className="truncate max-w-[250px]">{editAvatarUrl}</span>
                                                    <button type="button" onClick={() => setEditAvatarUrl('')} className="hover:text-red-400">Remove</button>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm text-white/70 mb-1">Title</label>
                                            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded py-2 px-3 text-white focus:outline-none focus:border-[#B0E0E6] transition-colors" placeholder="e.g. AI Creative" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-white/70 mb-1">Username</label>
                                            <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded py-2 px-3 text-white focus:outline-none focus:border-[#B0E0E6] transition-colors" placeholder="e.g. AI Architect" required />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-white/70 mb-1">First Name (Optional)</label>
                                                <input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded py-2 px-3 text-white focus:outline-none focus:border-[#B0E0E6] transition-colors" placeholder="e.g. Satoshi" />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-white/70 mb-1">Last Name (Optional)</label>
                                                <input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded py-2 px-3 text-white focus:outline-none focus:border-[#B0E0E6] transition-colors" placeholder="e.g. Nakamoto" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-white/70 mb-1">Bio</label>
                                            <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded py-2 px-3 text-white focus:outline-none focus:border-[#B0E0E6] transition-colors h-20 text-sm" placeholder="Tell us about yourself..." />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-white/70 mb-1">Links (comma-separated URLs)</label>
                                            <input type="text" value={editLinks} onChange={(e) => setEditLinks(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded py-2 px-3 text-white focus:outline-none focus:border-[#B0E0E6] transition-colors text-sm" placeholder="https://portfolio.com, https://github.com/you" />
                                        </div>
                                        <button type="submit" disabled={isSavingProfile} className="btn btn-primary w-fit mt-2">
                                            {isSavingProfile ? 'Saving...' : <><Check size={16} className="inline mr-2" /> Save Profile</>}
                                        </button>
                                    </form>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {loading ? <p>Loading network...</p> :
                                    users.length === 0 ? <p className="col-span-full">No creatives registered entirely.</p> :
                                        users.map(u => {
                                            const firstName = u.first_name || u.username || 'User';
                                            return (
                                            <div key={u.id} onClick={() => navigate(`/profile/${u.id}`)} className="glass-panel flex flex-col items-center p-6 hover:bg-white/10 transition-colors cursor-pointer text-center">
                                                <div className="w-20 h-20 rounded-full bg-black/40 border-2 border-[#B0E0E6]/40 flex items-center justify-center text-xl font-bold shadow-lg overflow-hidden mb-2">
                                                    {u.avatar_url ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" /> : (u.username?.[0]?.toUpperCase() || '?')}
                                                </div>
                                                <p className="text-xs text-[#B0E0E6] mb-2">{u.title || 'AI Creative'}</p>
                                                <h3 className="font-bold text-lg truncate w-full">
                                                    {(u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : (u.username || 'Anonymous')}
                                                </h3>
                                                {u.links && (
                                                    <div className="flex flex-wrap justify-center gap-2 mt-3">
                                                        {u.links.split(',').map((link, i) => {
                                                            const url = link.trim();
                                                            if (!url) return null;
                                                            const platform = getSocialPlatform(url);
                                                            const tooltip = getSocialTooltip(url, firstName);
                                                            return (
                                                                <a key={i} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noreferrer" title={tooltip} className="w-7 h-7 rounded bg-white/5 border border-white/10 hover:border-[#B0E0E6]/50 flex items-center justify-center transition-all" onClick={e => e.stopPropagation()}>
                                                                    {platform.logo ? <img src={platform.logo} alt={platform.name} className="w-4 h-4" /> : <ExternalLink size={12} className="text-white/60" />}
                                                                </a>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            );
                                        })
                                }
                            </div>
                        </div>
                    )
                }
                {/* Event Detail Modal Overlay */}
                {
                    selectedEvent && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
                            <div className="glass-panel max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
                                <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                                <div className="mb-6 flex flex-col items-center">
                                    <Calendar size={48} className="text-[#B0E0E6] opacity-50 mb-4" />
                                    <h2 className="text-3xl font-bold text-center mb-2">{selectedEvent.title}</h2>
                                    <div className="text-lg font-semibold text-[#B0E0E6]">
                                        {new Date(selectedEvent.event_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </div>
                                {selectedEvent.description ? (
                                    <div className="bg-black/30 p-4 rounded text-white/80 leading-relaxed max-h-[40vh] overflow-y-auto custom-scrollbar">
                                        {selectedEvent.description}
                                    </div>
                                ) : (
                                    <div className="text-center text-white/50 italic py-4">
                                        No additional description provided.
                                    </div>
                                )}
                                <div className="mt-8 flex justify-center">
                                    <button onClick={() => setSelectedEvent(null)} className="btn border-white/20 hover:bg-white/10">Close Details</button>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* Comments Modal */}
                {commentTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={closeComments}>
                        <div className="glass-panel max-w-lg w-full relative max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                                <h3 className="text-lg font-bold flex items-center gap-2"><MessageCircle size={18} /> Comments</h3>
                                <button onClick={closeComments} className="text-white/50 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 mb-4 custom-scrollbar min-h-[100px]">
                                {comments.length === 0 ? (
                                    <p className="text-white/50 text-sm italic text-center py-4">No comments yet. Be the first!</p>
                                ) : comments.map(c => (
                                    <div key={c.id} className="bg-black/30 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-black/40 border border-[#B0E0E6]/30 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                                    {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : (c.profiles?.username?.[0]?.toUpperCase() || '?')}
                                                </div>
                                                <span className="text-xs font-semibold text-white">{c.profiles?.username || 'Anonymous'}</span>
                                                <span className="text-[10px] text-white/30">{new Date(c.created_at).toLocaleDateString()}</span>
                                            </div>
                                            {c.user_id === session.user.id && (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }} className="text-white/30 hover:text-[#B0E0E6] p-1"><Edit size={12} /></button>
                                                    <button onClick={() => handleDeleteComment(c.id)} className="text-white/30 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                                                </div>
                                            )}
                                        </div>
                                        {editingCommentId === c.id ? (
                                            <div className="flex gap-2 mt-1">
                                                <input type="text" value={editCommentText} onChange={e => setEditCommentText(e.target.value)} className="flex-1 bg-black/40 border border-white/20 rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[#B0E0E6]" onKeyDown={e => e.key === 'Enter' && handleEditComment(c.id)} />
                                                <button onClick={() => handleEditComment(c.id)} className="text-[#B0E0E6] text-xs font-bold">Save</button>
                                                <button onClick={() => setEditingCommentId(null)} className="text-white/40 text-xs">Cancel</button>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-white/80">{c.content}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 border-t border-white/10 pt-3">
                                <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment..." className="flex-1 bg-black/40 border border-white/20 rounded py-2 px-3 text-sm text-white focus:outline-none focus:border-[#B0E0E6]" onKeyDown={e => e.key === 'Enter' && handleAddComment()} disabled={isSavingComment} />
                                <button onClick={handleAddComment} disabled={isSavingComment || !commentText.trim()} className="btn btn-primary text-sm px-4">{isSavingComment ? '...' : 'Post'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div >
        </div >
    );
}
