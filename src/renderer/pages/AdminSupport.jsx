import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LifeBuoy, Send, CheckCircle2, Filter, Users } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const filteredTickets = useMemo(() => {
    return statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const selectedTicket = useMemo(() => tickets.find(t => t.id === selectedId) || null, [tickets, selectedId]);

  useEffect(() => {
    let chTickets = null;
    const init = async () => {
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <LifeBuoy className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Support Center</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              className="border border-border rounded-md p-2 bg-background"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="waiting_admin">Waiting Admin</option>
              <option value="waiting_user">Waiting User</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border/60 flex items-center justify-between">
            <div className="font-semibold">Tickets</div>
            <div className="text-xs text-muted-foreground flex items-center">
              <Users className="w-3.5 h-3.5 mr-1" /> {filteredTickets.length}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {filteredTickets.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No tickets.</div>
            ) : filteredTickets.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full px-4 py-3 text-left border-b border-border/50 hover:bg-accent transition-colors ${selectedId === t.id ? 'bg-accent' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">{t.subject}</div>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${statusToBadge(t.status)}`}>{t.status.replace('_',' ')}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {t.user_profiles?.full_name || t.user_profiles?.username || t.user_profiles?.email || t.user_id}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 card flex flex-col min-h-[60vh]">
          {!selectedTicket ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-8">
              Select a ticket to view and reply.
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h2 className="font-semibold">{selectedTicket.subject}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${statusToBadge(selectedTicket.status)}`}>{selectedTicket.status.replace('_',' ')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                    <button className="btn btn-secondary" onClick={markResolved}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3">
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

              <div className="border-t border-border/60 p-3">
                <div className="flex items-end space-x-2">
                  <textarea
                    rows={2}
                    className="flex-1 resize-none border border-border rounded-md p-2 bg-background"
                    placeholder="Type your reply..."
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
                    }}
                  />
                  <button className="btn btn-primary" onClick={sendReply} disabled={sending || !composer.trim()}>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;


