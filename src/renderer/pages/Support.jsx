import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LifeBuoy, Plus, Send, X, ChevronLeft, CheckCircle2 } from 'lucide-react';
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

const Support = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [composer, setComposer] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', priority: 'normal', category: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const [userId, setUserId] = useState(null);

  const selectedTicket = useMemo(() => tickets.find(t => t.id === selectedId) || null, [tickets, selectedId]);

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
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </button>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6 h-full">
        {showList && (
          <div className="md:col-span-1 card overflow-hidden flex flex-col ring-1 ring-border/60">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <span className="font-semibold">My Tickets</span>
            </div>
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading…</div>
              ) : tickets.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  <div>No tickets yet.</div>
                  <button className="mt-3 btn btn-primary" onClick={() => setCreating(true)}>Create your first ticket</button>
                </div>
              ) : (
                tickets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-accent transition-colors ${selectedId === t.id ? 'bg-accent' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">{t.subject}</div>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${statusToBadge(t.status)}`}>
                        {t.status.replace('_',' ')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                      <span>{new Date(t.last_message_at).toLocaleString()}</span>
                      {t.unread_by_user && <span className="ml-2 inline-flex items-center text-primary">New</span>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {showThread && (
          <div className="md:col-span-2 card flex flex-col min-h-[60vh] ring-1 ring-border/60">
            {!selectedTicket ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-8">
                Select a ticket to view the conversation.
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {isMobile && (
                      <button className="mr-2 p-2 rounded hover:bg-muted" onClick={() => setSelectedId(null)}>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                    <h2 className="font-semibold">{selectedTicket.subject}</h2>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${statusToBadge(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('_',' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedTicket.status !== 'closed' && (
                      <button className="btn btn-secondary" onClick={closeTicket}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Close
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-3">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-2 text-sm ${m.sender_role === 'admin' ? 'bg-emerald-50 text-emerald-900' : 'bg-muted text-foreground'}`}>
                        <div className="text-xs opacity-70 mb-1">{m.sender_role === 'admin' ? 'Support' : 'You'}</div>
                        <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        <div className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-border/60 p-3">
                  {selectedTicket.status === 'closed' && (
                    <div className="text-xs text-muted-foreground mb-2">
                      This ticket is closed. You can no longer send messages.
                    </div>
                  )}
                  <div className="flex items-end space-x-2">
                    <textarea
                      rows={2}
                      className="flex-1 resize-none border border-border rounded-md p-3 bg-background shadow-sm"
                      placeholder={selectedTicket.status === 'closed' ? 'Ticket is closed' : 'Type your message...'}
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
                    <button className="btn btn-primary" onClick={sendMessage} disabled={selectedTicket.status === 'closed' || sending || !composer.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </button>
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


