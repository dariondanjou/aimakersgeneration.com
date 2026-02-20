import { Globe, Calendar, Users, Newspaper, Search, LogOut } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useState, useEffect } from 'react';

export default function Dashboard({ session }) {
    const [activeTab, setActiveTab] = useState('home');
    const [searchQuery, setSearchQuery] = useState('');

    // Data States
    const [users, setUsers] = useState([]);
    const [resources, setResources] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [events, setEvents] = useState([]);
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

            // Fetch top 5 resources
            const { data: resourcesData } = await supabase
                .from('resources')
                .select(`id, title, url, profiles(username)`)
                .order('created_at', { ascending: false })
                .limit(5);
            if (resourcesData) setResources(resourcesData);

            // Fetch nearest 3 events
            const { data: eventsData } = await supabase
                .from('events')
                .select('*')
                .order('event_date', { ascending: true })
                .limit(3);
            if (eventsData) setEvents(eventsData);

            // Fetch 3 newest users
            const { data: usersData } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .order('updated_at', { ascending: false })
                .limit(3);
            if (usersData) setUsers(usersData);

            setLoading(false);
        }

        fetchDashboardData();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="flex flex-col h-full p-6 relative overflow-hidden text-lg">

            {/* Top Navigation & Search */}
            <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-6 relative z-10">
                <div className="flex gap-4 p-1">
                    <button onClick={() => setActiveTab('home')} className={`px - 4 py - 2 rounded - full text - sm font - semibold transition - colors ${activeTab === 'home' ? 'bg-[#64FFDA] text-[#0A192F]' : 'hover:bg-white/10 text-white'} `}>
                        <Globe size={16} className="inline mr-2" /> Home
                    </button>
                    <button onClick={() => setActiveTab('news')} className={`px - 4 py - 2 rounded - full text - sm font - semibold transition - colors ${activeTab === 'news' ? 'bg-[#64FFDA] text-[#0A192F]' : 'hover:bg-white/10 text-white'} `}>
                        <Newspaper size={16} className="inline mr-2" /> News
                    </button>
                    <button onClick={() => setActiveTab('resources')} className={`px - 4 py - 2 rounded - full text - sm font - semibold transition - colors ${activeTab === 'resources' ? 'bg-[#64FFDA] text-[#0A192F]' : 'hover:bg-white/10 text-white'} `}>
                        <Globe size={16} className="inline mr-2" /> Resources
                    </button>
                    <button onClick={() => setActiveTab('calendar')} className={`px - 4 py - 2 rounded - full text - sm font - semibold transition - colors ${activeTab === 'calendar' ? 'bg-[#64FFDA] text-[#0A192F]' : 'hover:bg-white/10 text-white'} `}>
                        <Calendar size={16} className="inline mr-2" /> Calendar
                    </button>
                    <button onClick={() => setActiveTab('people')} className={`px - 4 py - 2 rounded - full text - sm font - semibold transition - colors ${activeTab === 'people' ? 'bg-[#64FFDA] text-[#0A192F]' : 'hover:bg-white/10 text-white'} `}>
                        <Users size={16} className="inline mr-2" /> People
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={16} />
                        <input
                            type="text"
                            placeholder="Fuzzy search anything..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-b border-white/20 py-2 pl-10 pr-4 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#64FFDA] transition-colors w-64"
                        />
                    </div>

                    <button onClick={handleSignOut} className="p-2 text-white/60 hover:text-white bg-white/5 rounded-full hover:bg-white/10 transition-colors" title="Sign Out">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* Main Content Area Based on Tab */}
            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar relative z-10">
                {activeTab === 'home' && (
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-8 flex flex-col gap-6">
                            <div className="glass-panel relative overflow-hidden min-h-[200px]">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><Newspaper size={64} /></div>
                                <div className="mb-4">
                                    <h2 className="text-2xl font-bold text-[#F0E68C]">Latest Announcements</h2>
                                </div>

                                {loading ? <p className="text-white/50">Loading announcements...</p> :
                                    announcements.length === 0 ? <p className="text-white/50 italic">No announcements posted yet.</p> :
                                        <div className="space-y-4 relative z-10">
                                            {announcements.map(post => (
                                                <div key={post.id} className="border-b border-white/10 pb-3 last:border-0">
                                                    <h4 className="font-bold text-lg">{post.title}</h4>
                                                    {post.excerpt && <p className="text-white/70 text-sm mt-1">{post.excerpt}</p>}
                                                    <div className="text-xs text-white/40 mt-2">Posted by {post.profiles?.username || 'Admin'} • {new Date(post.created_at).toLocaleDateString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                }
                                <div className="mt-4 text-right relative z-10 w-full">
                                    <button onClick={() => setActiveTab('news')} className="text-sm text-white hover:text-[#64FFDA] hover:underline">View More...</button>
                                </div>
                            </div>
                            <div className="glass-panel p-6">
                                <div className="mb-4">
                                    <h2 className="text-xl font-bold">Top Active Resources</h2>
                                </div>
                                {loading ? <p className="text-white/50">Loading resources...</p> :
                                    resources.length === 0 ? <p className="text-white/50 italic">No resources added to the wiki yet.</p> :
                                        <ul className="space-y-3">
                                            {resources.map(res => (
                                                <li key={res.id} className="flex flex-col p-3 border-b border-white/10 last:border-0">
                                                    <a href={res.url} target="_blank" rel="noreferrer" className="font-semibold text-white hover:text-[#64FFDA] transition-colors">{res.title}</a>
                                                    <span className="text-xs text-white/40 mt-1">Edited by {res.profiles?.username || 'Anonymous'}</span>
                                                </li>
                                            ))}
                                        </ul>
                                }
                                <div className="mt-4 text-right relative z-10 w-full">
                                    <button onClick={() => setActiveTab('resources')} className="text-sm text-white hover:text-[#64FFDA] hover:underline">View Wiki...</button>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-4 flex flex-col gap-6">
                            <div className="glass-panel p-6">
                                <div className="mb-4 border-b border-white/10 pb-2">
                                    <h2 className="text-lg font-bold">Upcoming Events</h2>
                                </div>
                                {loading ? <p className="text-white/50 text-sm">Loading events...</p> :
                                    events.length === 0 ? <p className="text-white/50 italic text-sm">No upcoming events scheduled.</p> :
                                        <ul className="space-y-4">
                                            {events.map(ev => (
                                                <li key={ev.id}>
                                                    <div className="font-bold text-sm text-[#F0E68C]">{new Date(ev.event_date).toLocaleDateString()}</div>
                                                    <div className="text-sm">{ev.title}</div>
                                                </li>
                                            ))}
                                        </ul>
                                }
                                <div className="mt-4 text-right relative z-10 w-full">
                                    <button onClick={() => setActiveTab('calendar')} className="text-sm text-white hover:text-[#64FFDA] hover:underline">Full Calendar...</button>
                                </div>
                            </div>

                            <div className="glass-panel p-6">
                                <div className="mb-4 border-b border-white/10 pb-2">
                                    <h2 className="text-lg font-bold text-[#64FFDA]">Newest Architects</h2>
                                </div>
                                {loading ? <p className="text-white/50 text-sm">Loading network...</p> :
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {users.map(u => (
                                            <div key={u.id} className="group relative">
                                                <div className="w-10 h-10 rounded-full bg-black/40 border border-[#64FFDA]/40 flex items-center justify-center text-sm font-bold shadow-lg overflow-hidden">
                                                    {u.avatar_url ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" /> : (u.username?.[0]?.toUpperCase() || '?')}
                                                </div>
                                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity bg-black px-2 py-1 rounded whitespace-nowrap z-20">
                                                    {u.username || 'Anonymous'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                }
                                <div className="mt-6 text-right relative z-10 w-full pt-4 border-t border-white/10">
                                    <button onClick={() => setActiveTab('people')} className="text-sm text-white hover:text-[#64FFDA] hover:underline">All People...</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'news' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold text-[#F0E68C]">The Daily Blueprint (News)</h2>
                            <button className="btn btn-primary text-sm">Submit News</button>
                        </div>
                        <div className="grid grid-cols-12 gap-6">
                            <div className="col-span-8 flex flex-col gap-4">
                                {loading && <p>Loading news...</p>}
                                {!loading && announcements.length === 0 && (
                                    <div className="glass-panel text-white/50 italic text-center py-12">No news items have been published yet.</div>
                                )}
                                {announcements.map(post => (
                                    <div key={post.id} className="glass-panel p-6 border-l-4 border-[#64FFDA]">
                                        <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                                        <p className="text-white/80 mb-4">{post.excerpt}</p>
                                        <div className="flex justify-between text-xs text-white/40 border-t border-white/10 pt-3">
                                            <span>Posted by {post.profiles?.username || 'Admin'}</span>
                                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="col-span-4 rounded-lg bg-white/5 border border-white/10 p-6">
                                <h3 className="text-xl font-bold mb-4 border-b border-white/10 pb-2">FutureTools Feed</h3>
                                <p className="text-sm text-white/50 italic">Live scraping integration pending backend proxy deployment.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'resources' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold text-[#F0E68C]">Open-Source Wiki</h2>
                            <button className="btn btn-primary text-sm">+ Add Resource</button>
                        </div>

                        <div className="glass-panel p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/20 text-white/50 text-sm">
                                            <th className="pb-3 pt-2 px-4 font-normal">Resource Title</th>
                                            <th className="pb-3 pt-2 px-4 font-normal">Link</th>
                                            <th className="pb-3 pt-2 px-4 font-normal">Last Edited By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? <tr><td colSpan="3" className="text-center py-4">Loading...</td></tr> :
                                            resources.length === 0 ? <tr><td colSpan="3" className="text-center py-8 italic text-white/50">Wiki contains no entries yet.</td></tr> :
                                                resources.map(res => (
                                                    <tr key={res.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                        <td className="py-3 px-4 font-semibold">{res.title}</td>
                                                        <td className="py-3 px-4"><a href={res.url} className="text-[#64FFDA] hover:underline truncate inline-block max-w-[200px]" target="_blank" rel="noreferrer">{res.url}</a></td>
                                                        <td className="py-3 px-4 text-white/60 text-sm">{res.profiles?.username || 'Anonymous'}</td>
                                                    </tr>
                                                ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold text-[#F0E68C]">Project Deadlines & Events</h2>
                            {/* In a real app, only Admins would see this button based on logic mapping to session */}
                            <button className="btn btn-primary text-sm opacity-50 cursor-not-allowed">Admin: Add Event</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? <p>Loading calendar...</p> :
                                events.length === 0 ? <div className="col-span-full glass-panel py-12 text-center text-white/50 italic">No events mapped.</div> :
                                    events.map(ev => (
                                        <div key={ev.id} className="glass-panel border-[#F0E68C]/30 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden group hover:border-[#F0E68C] transition-colors">
                                            <Calendar size={48} className="text-white/10 absolute -right-4 -bottom-4 group-hover:text-white/20 transition-colors" />
                                            <div className="text-[#F0E68C] text-2xl font-bold mb-2">{new Date(ev.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                            <h3 className="text-lg font-bold z-10">{ev.title}</h3>
                                            {ev.description && <p className="text-sm text-white/60 mt-2 z-10">{ev.description}</p>}
                                        </div>
                                    ))
                            }
                        </div>
                    </div>
                )}

                {activeTab === 'people' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold text-[#F0E68C]">Network Architects</h2>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {loading ? <p>Loading network...</p> :
                                users.length === 0 ? <p className="col-span-full">No architects registered entirely.</p> :
                                    users.map(u => (
                                        <div key={u.id} className="glass-panel flex flex-col items-center p-6 hover:bg-white/10 transition-colors cursor-pointer text-center">
                                            <div className="w-20 h-20 rounded-full bg-black/40 border-2 border-[#64FFDA]/40 flex items-center justify-center text-xl font-bold shadow-lg overflow-hidden mb-4">
                                                {u.avatar_url ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" /> : (u.username?.[0]?.toUpperCase() || '?')}
                                            </div>
                                            <h3 className="font-bold text-lg truncate w-full">{u.username || 'Anonymous'}</h3>
                                            <p className="text-xs text-[#64FFDA] mt-1">Founding Member</p>
                                        </div>
                                    ))
                            }
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
