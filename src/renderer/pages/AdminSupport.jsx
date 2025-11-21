import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LifeBuoy, Send, CheckCircle2, Users, Ticket, Hourglass, XCircle, ChevronDown, User } from 'lucide-react';
import supabaseService from '../services/supabaseService.js';

const statusToBadge = (status) => {
  const map = {
    open: 'bg-blue-100 text-blue-700',
    waiting_admin: 'bg-amber-100 text-amber-700',
    waiting_user: 'bg-purple-100 text-purple-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-gray-100 text-gray-600'
  };
  return map[status] || 'bg-muted text-foreground';
};

const AdminSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userFilter, setUserFilter] = useState('all');
  const [agentFilter] = useState('all'); // Placeholder (no agent assignment in schema yet)
  const messagesEndRef = useRef(null);

  const uniqueUsers = useMemo(() => {
    const arr = [];
    const seen = new Set();
    tickets.forEach(t => {
      const id = t.user_id || t.user_profiles?.id;
      const key = id || t.user_profiles?.email || t.user_profiles?.username;
      if (!key || seen.has(key)) return;
      seen.add(key);
      arr.push({
        id: id || key,
        label: t.user_profiles?.full_name || t.user_profiles?.username || t.user_profiles?.email || (id ? id.slice(0, 8) : 'User')
      });
    });
    return arr.sort((a, b) => a.label.localeCompare(b.label));
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (userFilter === 'all') return tickets;
    return tickets.filter(t => (t.user_id || t.user_profiles?.id || t.user_profiles?.email || '').toString() === userFilter.toString());
  }, [tickets, userFilter]);

  const selectedTicket = useMemo(() => tickets.find(t => t.id === selectedId) || null, [tickets, selectedId]);

  useEffect(() => {
    let chTickets = null;
    const init = async () => {
      const me = await supabaseService.getCurrentUser();
      if (me?.success) setCurrentUser(me.user || null);
      const res = await supabaseService.adminListAllTickets({});
      if (res.success) setTickets(res.data);
      try {
        chTickets = supabaseService.client
          ?.channel('support_tickets_admin')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
            refreshTickets();
          })
          .subscribe();
      } catch (_) {}
    };
    init();
    return () => { if (chTickets) supabaseService.removeChannel(chTickets); };
  }, []);

  useEffect(() => {
    let sub = null;
    const load = async () => {
      if (!selectedId) return;
      const res = await supabaseService.getSupportMessages(selectedId);
      if (res.success) setMessages(res.data);
      await supabaseService.markTicketRead(selectedId, 'admin');
      sub = supabaseService.subscribeToSupportMessages(selectedId, (row) => {
        if (!row) return;
        setMessages(prev => prev.some(m => m.id === row.id) ? prev : [...prev, row]);
      });
    };
    load();
    return () => { if (sub) supabaseService.removeChannel(sub); };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const refreshTickets = async () => {
    const res = await supabaseService.adminListAllTickets({});
    if (res.success) setTickets(res.data);
  };

  const sendReply = async () => {
    if (!composer.trim() || !selectedId) return;
    setSending(true);
    const res = await supabaseService.addSupportMessage(selectedId, composer.trim(), { asAdmin: true });
    setSending(false);
    if (res.success) {
      setComposer('');
      refreshTickets();
    }
  };

  const markResolved = async () => {
    if (!selectedId) return;
    await supabaseService.updateSupportTicket(selectedId, { status: 'resolved', unread_by_admin: false });
    refreshTickets();
  };

  // Stats
  const stats = useMemo(() => {
    const open = tickets.filter(t => t.status === 'open').length;
    const pending = tickets.filter(t => t.status === 'waiting_admin' || t.status === 'waiting_user').length;
    const closed = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    return { open, pending, closed };
  }, [tickets]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <LifeBuoy className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Support Center</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">View and manage tickets in realtime</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="font-semibold">{currentUser?.user_metadata?.full_name || 'Admin User'}</p>
              <p className="text-xs text-muted-foreground">{currentUser?.email || ''}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Open Tickets</h3>
            <Ticket className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold mt-2">{stats.open}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending Tickets</h3>
            <Hourglass className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold mt-2">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Closed Tickets</h3>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold mt-2">{stats.closed}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ height: '65vh' }}>
        <div className="grid grid-cols-12 h-full">
          {/* Left: Tickets & Filters */}
          <div className="col-span-12 lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Tickets</h3>
                <div className="text-xs text-muted-foreground flex items-center"><Users className="w-3.5 h-3.5 mr-1" />{filteredTickets.length}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <button className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-left text-sm flex items-center justify-between">
                    <span>All Agents</span>
                    <ChevronDown className="w-4 h-4 opacity-70" />
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <select
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                  >
                    <option value="all">All Users</option>
                    {uniqueUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No tickets.</div>
              ) : (
                <ul>
                  {filteredTickets.map((t) => {
                    const active = selectedId === t.id;
                    const statusColor = t.status === 'open'
                      ? 'text-red-500'
                      : (t.status === 'resolved' || t.status === 'closed' ? 'text-slate-500' : 'text-amber-600');
                    return (
                      <li key={t.id}>
                        <button
                          className={`w-full text-left border-b border-slate-200 dark:border-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${active ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                          onClick={() => setSelectedId(t.id)}
                        >
                          <div className="flex justify-between items-center">
                            <p className="font-semibold">{t.subject || 'Untitled ticket'}</p>
                            <span className={`text-sm font-medium ${statusColor}`}>{t.status?.replace('_', ' ')}</span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(t.last_message_at || t.created_at).toLocaleString()}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right: Thread */}
          <div className="col-span-12 lg:col-span-8 flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold">{selectedTicket ? selectedTicket.subject : 'Select a ticket'}</h3>
            </div>

            {!selectedTicket ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="text-6xl text-slate-300 dark:text-slate-600 mb-4">📥</div>
                <p className="text-slate-500 dark:text-slate-400">No ticket selected.</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">Choose a ticket from the left panel to view its details.</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.sender_role === 'admin' ? 'bg-emerald-50 text-emerald-900' : 'bg-muted text-foreground'}`}>
                        <div className="text-xs opacity-70 mb-1">{m.sender_role === 'admin' ? 'Admin' : 'User'}</div>
                        <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        <div className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between mb-3">
                    {(selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed') && (
                      <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-amber-500 text-white hover:bg-amber-600" onClick={markResolved}>
                        <CheckCircle2 className="w-4 h-4" />
                        Mark Resolved
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <textarea
                      className="w-full p-3 pr-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary transition duration-150 resize-none"
                      placeholder="Type a reply..."
                      rows={3}
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    />
                    <button
                      className="absolute right-3 bottom-3 bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition duration-150 disabled:opacity-60"
                      onClick={sendReply}
                      disabled={sending || !composer.trim()}
                    >
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        <span>Send</span>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;


