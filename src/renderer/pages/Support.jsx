import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LifeBuoy, Plus, Send, X, ChevronLeft, CheckCircle2, Paperclip, Search } from 'lucide-react';
import supabaseService from '../services/supabaseService.js';
import formatRelativeTime from '../utils/time.js';

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

const Support = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [composer, setComposer] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', priority: 'normal', category: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const [userId, setUserId] = useState(null);

  const selectedTicket = useMemo(() => tickets.find(t => t.id === selectedId) || null, [tickets, selectedId]);
  const filteredTickets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(t =>
      String(t.subject || '').toLowerCase().includes(q) ||
      String(t.id || '').toLowerCase().includes(q)
    );
  }, [tickets, query]);

  const ticketDisplayId = (id) => {
    if (!id) return '';
    const s = String(id);
    return `#${s.slice(-5)}`;
  };

  const statusLabel = (status) => {
    if (!status) return 'Open';
    if (status === 'resolved') return 'Resolved';
    if (status === 'closed') return 'Closed';
    if (status === 'open' || status === 'waiting_admin' || status === 'waiting_user') return 'Pending';
    return status.replace('_', ' ');
  };

  useEffect(() => {
    let sub = null;
    const init = async () => {
      const me = await supabaseService.getCurrentUser();
      if (me?.success && me.user?.id) {
        setUserId(me.user.id);
        const list = await supabaseService.listMySupportTickets({});
        if (list.success) setTickets(list.data);
        sub = supabaseService.subscribeToMyTickets(me.user.id, async () => {
          const l = await supabaseService.listMySupportTickets({});
          if (l.success) setTickets(l.data);
        });
      }
      setLoading(false);
    };
    init();
    return () => { if (sub) supabaseService.removeChannel(sub); };
  }, []);

  useEffect(() => {
    let sub = null;
    const load = async () => {
      if (!selectedId) return;
      const res = await supabaseService.getSupportMessages(selectedId);
      if (res.success) setMessages(res.data);
      await supabaseService.markTicketRead(selectedId, 'user');
      sub = supabaseService.subscribeToSupportMessages(selectedId, (row) => {
        if (!row) return;
        setMessages(prev => {
          const exists = prev.some(m => m.id === row.id);
          return exists ? prev : [...prev, row];
        });
      });
    };
    load();
    return () => { if (sub) supabaseService.removeChannel(sub); };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createTicket = async (e) => {
    e?.preventDefault?.();
    if (!newTicket.subject.trim() || !newTicket.message.trim()) return;
    setSending(true);
    const res = await supabaseService.createSupportTicket({
      subject: newTicket.subject.trim(),
      priority: newTicket.priority,
      category: newTicket.category || null,
      message: newTicket.message.trim()
    });
    setSending(false);
    if (res.success) {
      setCreating(false);
      setNewTicket({ subject: '', priority: 'normal', category: '', message: '' });
      setSelectedId(res.data.id);
      const list = await supabaseService.listMySupportTickets({});
      if (list.success) setTickets(list.data);
    }
  };

  const sendMessage = async () => {
    const text = composer.trim();
    if (!text || !selectedId) return;
    setSending(true);
    const res = await supabaseService.addSupportMessage(selectedId, text, { asAdmin: false });
    setSending(false);
    if (res.success) {
      setComposer('');
      // Refresh thread to show immediately (in addition to realtime)
      const latest = await supabaseService.getSupportMessages(selectedId);
      if (latest.success) setMessages(latest.data);
    }
  };

  const closeTicket = async () => {
    if (!selectedId) return;
    await supabaseService.updateSupportTicket(selectedId, { status: 'closed', unread_by_user: false });
    const list = await supabaseService.listMySupportTickets({});
    if (list.success) setTickets(list.data);
  };

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const showList = !isMobile || !selectedId;
  const showThread = !isMobile || !!selectedId;

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center space-x-2">
          <LifeBuoy className="w-5 h-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Support</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 sm:p-6 h-full">
        {showList && (
          <div className="lg:col-span-1 flex flex-col bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 h-full overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold">My Tickets</h2>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors" onClick={() => setCreating(true)}>
                <Plus className="w-4 h-4" />
                <span>New Ticket</span>
              </button>
            </div>

            <div className="p-4">
              <div className="flex w-full items-center rounded-lg h-11 bg-gray-100 dark:bg-gray-800">
                <div className="pl-3 text-gray-500 dark:text-gray-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  className="flex-1 bg-transparent outline-none px-3 text-sm"
                  placeholder="Search tickets..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
              {loading ? (
                <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
                  No tickets.
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const active = selectedId === t.id;
                  const created = formatRelativeTime(t.created_at);
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={`w-full text-left rounded-lg border transition-colors p-3 ${active ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800' : 'bg-white dark:bg-transparent border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <p className={`truncate ${active ? 'text-primary dark:text-white font-semibold' : 'text-[#111418] dark:text-white font-medium'}`}>{t.subject}</p>
                          <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${t.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : t.status === 'closed' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'}`}>
                            {statusLabel(t.status)}
                          </span>
                        </div>
                        <p className="text-xs text-[#617589] dark:text-gray-400">{`Ticket ${ticketDisplayId(t.id)}`}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-xs text-[#617589] dark:text-gray-400">Created: {created}</p>
                          {t.unread_by_user && <span className="text-xs text-primary">New</span>}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {showThread && (
          <div className="lg:col-span-2 flex flex-col bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 h-full">
            {!selectedTicket ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm p-8">
                Select a ticket to view the conversation.
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-start sm:items-center flex-col sm:flex-row sm:gap-2">
                    {isMobile && (
                      <button className="mr-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setSelectedId(null)}>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                    <h3 className="text-lg font-bold">{selectedTicket.subject}</h3>
                    <p className="text-sm text-[#617589] dark:text-gray-400">Ticket {ticketDisplayId(selectedTicket.id)}</p>
                  </div>
                  {selectedTicket.status !== 'closed' && (
                    <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-[#111418] dark:text-white text-sm font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" onClick={closeTicket}>
                      Close Ticket
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.map((m) => {
                    const isUser = m.sender_role === 'user';
                    return (
                      <div key={m.id} className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        {!isUser && (
                          <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                            {/* agent icon placeholder */}
                            <span className="text-xs text-gray-600 dark:text-gray-300">S</span>
                          </div>
                        )}
                        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1.5 max-w-[85%] sm:max-w-[70%]`}>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{isUser ? 'You' : 'Support Agent'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatRelativeTime(m.created_at)}</p>
                          </div>
                          <div className={`${isUser ? 'bg-primary text-white rounded-xl rounded-tr-none' : 'bg-gray-100 dark:bg-gray-800 text-foreground rounded-xl rounded-tl-none'} p-3`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                          </div>
                        </div>
                        {isUser && (
                          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-xs text-primary">Y</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
                  {selectedTicket.status === 'closed' && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">This ticket is closed. You can no longer send messages.</div>
                  )}
                  <div className="relative">
                    <textarea
                      className="w-full resize-none rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-primary/50 focus:border-primary pl-10 pr-28 py-2.5 text-sm"
                      placeholder="Type your reply here..."
                      rows="1"
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && selectedTicket.status !== 'closed') {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={selectedTicket.status === 'closed'}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary/80"
                        type="button"
                        aria-label="Attach file"
                        disabled
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <button
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
                        onClick={sendMessage}
                        disabled={selectedTicket.status === 'closed' || sending || !composer.trim()}
                      >
                        <span>Send</span>
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {creating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCreating(false)} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            className="relative w-[94%] sm:w-[560px] md:w-[640px] max-w-[96vw] rounded-2xl border border-border shadow-2xl bg-white dark:bg-neutral-900"
          >
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <LifeBuoy className="w-4 h-4 text-primary" />
                <span className="font-semibold">New Support Ticket</span>
              </div>
              <button className="p-2 rounded hover:bg-muted" onClick={() => setCreating(false)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form className="p-5 space-y-4" onSubmit={createTicket}>
              <div>
                <label className="text-sm mb-1 block">Subject</label>
                <input
                  className="w-full border border-border rounded-md p-3 bg-white dark:bg-neutral-900 shadow-sm"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(s => ({ ...s, subject: e.target.value }))}
                  placeholder="Briefly describe your issue"
                  required
                />
              </div>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="text-sm mb-1 block">Category</label>
                  <input
                    className="w-full border border-border rounded-md p-3 bg-white dark:bg-neutral-900 shadow-sm"
                    value={newTicket.category}
                    onChange={(e) => setNewTicket(s => ({ ...s, category: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="w-44">
                  <label className="text-sm mb-1 block">Priority</label>
                  <select
                    className="w-full border border-border rounded-md p-3 bg-white dark:bg-neutral-900 shadow-sm"
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket(s => ({ ...s, priority: e.target.value }))}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm mb-1 block">Message</label>
                <textarea
                  rows={5}
                  className="w-full border border-border rounded-md p-3 bg-white dark:bg-neutral-900 resize-y shadow-sm"
                  value={newTicket.message}
                  onChange={(e) => setNewTicket(s => ({ ...s, message: e.target.value }))}
                  placeholder="Tell us what happened and how we can help"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? 'Creating…' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Support;


