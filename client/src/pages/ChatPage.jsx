import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PaperAirplaneIcon, PaperClipIcon, MagnifyingGlassIcon,
  PhoneIcon, VideoCameraIcon, ArrowLeftIcon, EllipsisVerticalIcon,
  FaceSmileIcon, CheckIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckSolid } from '@heroicons/react/24/solid';
import { chatAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import useAuthStore from '../context/authStore';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';

const AVATAR_GRADIENTS = [
  ['#0ea5e9','#0284c7'],['#8b5cf6','#7c3aed'],['#10b981','#059669'],
  ['#f59e0b','#d97706'],['#f43f5e','#e11d48'],['#14b8a6','#0d9488'],
];
const getGradient = (name='') => {
  const i = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
  const [f,t] = AVATAR_GRADIENTS[i];
  return `linear-gradient(135deg,${f},${t})`;
};
const getDiceBearUrl = (name='') => {
  const seed = encodeURIComponent(name.replace(/Dr\.?\s*/i,'').trim());
  const styles = ['lorelei','notionists'];
  const i = (name.charCodeAt(0) || 0) % styles.length;
  return `https://api.dicebear.com/7.x/${styles[i]}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede`;
};

const getDateLabel = (date) => {
  if (isToday(new Date(date))) return 'Today';
  if (isYesterday(new Date(date))) return 'Yesterday';
  return format(new Date(date), 'MMMM d, yyyy');
};

const UserAvatar = ({ user, size='sm' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const sz = size === 'lg' ? 'w-12 h-12 rounded-2xl text-base' : size === 'md' ? 'w-10 h-10 rounded-xl text-sm' : 'w-8 h-8 rounded-xl text-xs';
  const gradient = getGradient(user?.name || '');

  if (user?.avatar && !imgFailed) {
    return <img src={user.avatar} alt={user.name} className={`${sz} object-cover flex-shrink-0`} onError={() => setImgFailed(true)} />;
  }
  return (
    <div className={`${sz} overflow-hidden flex-shrink-0`} style={{ background: gradient }}>
      <img src={getDiceBearUrl(user?.name || '')} alt={user?.name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
    </div>
  );
};

const TypingIndicator = () => (
  <div className="flex items-end gap-2 mb-3">
    <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
    <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 border border-slate-200 dark:border-gray-700 shadow-sm">
      <div className="flex gap-1 items-center">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  </div>
);

const MessageBubble = ({ message, isOwn, showAvatar, sender }) => {
  const time = format(new Date(message.createdAt), 'HH:mm');
  return (
    <div className={`flex items-end gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && (
        showAvatar
          ? <UserAvatar user={sender} size="sm" />
          : <div className="w-8 flex-shrink-0" />
      )}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {message.type === 'image' ? (
          <div className={`rounded-2xl overflow-hidden shadow-md ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'}`}>
            <img src={message.fileUrl} alt="attachment" className="max-w-[220px] max-h-48 object-cover" />
          </div>
        ) : message.type === 'file' ? (
          <a href={message.fileUrl} target="_blank" rel="noreferrer"
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium shadow-sm
              ${isOwn ? 'rounded-br-md bubble-sent' : 'bubble-recv'}`}>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <PaperClipIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="truncate max-w-[140px]">{message.fileName || 'Download file'}</p>
              {message.fileSize && <p className="text-[10px] opacity-70">{(message.fileSize/1024).toFixed(0)} KB</p>}
            </div>
          </a>
        ) : (
          <div className={isOwn ? 'bubble-sent' : 'bubble-recv'}>
            {message.isDeleted
              ? <em className="opacity-50 text-xs">Message deleted</em>
              : <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            }
          </div>
        )}
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-slate-400">{time}</span>
          {isOwn && (
            message.isRead
              ? <span className="text-[10px] text-sky-400 font-bold">✓✓</span>
              : <span className="text-[10px] text-slate-400">✓</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ChatPage() {
  const { userId: paramUserId } = useParams();
  const { user } = useAuthStore();
  const { socket, isUserOnline } = useSocket();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { loadConversations(); loadChatUsers(); }, []);
  useEffect(() => {
    if (paramUserId && chatUsers.length > 0) {
      const u = chatUsers.find(u => u._id === paramUserId);
      if (u) openConversation(u);
    }
  }, [paramUserId, chatUsers]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_message', (msg) => {
      if (activeUser && (msg.sender._id === activeUser._id || msg.sender === activeUser._id)) {
        setMessages(prev => [...prev, msg]);
        socket.emit('mark_read', { conversationId: msg.conversationId, senderId: msg.sender._id });
      }
      loadConversations();
    });
    socket.on('typing_start', ({ senderId }) => { if (activeUser?._id === senderId) setIsTyping(true); });
    socket.on('typing_stop',  ({ senderId }) => { if (activeUser?._id === senderId) setIsTyping(false); });
    return () => { socket.off('new_message'); socket.off('typing_start'); socket.off('typing_stop'); };
  }, [socket, activeUser]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, isTyping]);

  const loadConversations = async () => {
    try { const { data } = await chatAPI.getConversations(); setConversations(data.conversations || []); } catch {}
  };
  const loadChatUsers = async () => {
    try { const { data } = await chatAPI.getChatUsers(); setChatUsers(data.users || []); } catch {}
  };
  const openConversation = async (usr) => {
    setActiveUser(usr); setLoading(true);
    try { const { data } = await chatAPI.getMessages(usr._id); setMessages(data.messages || []); }
    catch {} finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeUser || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try { await chatAPI.sendMessage({ receiverId: activeUser._id, content: text }); }
    catch { toast.error('Failed to send message'); setInput(text); }
    finally { setSending(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeUser) return;
    const fd = new FormData();
    fd.append('file', file); fd.append('receiverId', activeUser._id);
    try { await chatAPI.sendMessage(fd); toast.success('File sent!'); }
    catch { toast.error('Upload failed'); }
  };

  const handleTyping = (val) => {
    setInput(val);
    if (!socket || !activeUser) return;
    socket.emit('typing_start', { receiverId: activeUser._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('typing_stop', { receiverId: activeUser._id }), 1500);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const allUsers = [
    ...chatUsers,
    ...conversations.map(c => c.participant).filter(p => p && !chatUsers.find(u => u._id === p._id)),
  ].filter(Boolean);
  const filtered = allUsers.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  const msgsByDate = {};
  messages.forEach(m => {
    const d = getDateLabel(m.createdAt);
    if (!msgsByDate[d]) msgsByDate[d] = [];
    msgsByDate[d].push(m);
  });

  return (
    <div className="flex h-full overflow-hidden bg-slate-50 dark:bg-gray-950">
      {/* ── Contacts sidebar ─────────────────────────── */}
      <div className={`${activeUser ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 xl:w-96 flex-col bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 flex-shrink-0`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-800">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white text-lg mb-3">Messages</h2>
          <div className="search-box">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input type="text" placeholder="Search conversations…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400" />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500">No conversations found</div>
          )}
          {filtered.map(u => {
            const conv = conversations.find(c => c.participant?._id === u._id);
            const online = isUserOnline(u._id);
            const active = activeUser?._id === u._id;
            return (
              <button key={u._id}
                onClick={() => { openConversation(u); navigate(`/chat/${u._id}`); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left border-b border-slate-50 dark:border-gray-800/50
                  ${active ? 'bg-sky-50 dark:bg-sky-900/10 border-l-2 border-l-sky-500' : 'hover:bg-slate-50 dark:hover:bg-gray-800/50'}`}>
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-xl overflow-hidden" style={{ background: getGradient(u.name) }}>
                    {u.avatar
                      ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                      : <img src={getDiceBearUrl(u.name)} alt={u.name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                    }
                  </div>
                  {online && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white dark:border-gray-900" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold truncate ${active ? 'text-sky-700 dark:text-sky-400' : 'text-slate-900 dark:text-white'}`}>{u.name}</p>
                    {conv?.lastMessage && <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{format(new Date(conv.lastMessage.createdAt),'HH:mm')}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                      {conv?.lastMessage?.content || (u.role === 'doctor' ? u.specialization : u.role)}
                    </p>
                    {(conv?.unreadCount || 0) > 0 && (
                      <span className="w-5 h-5 bg-sky-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 ml-1">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chat area ────────────────────────────────── */}
      {activeUser ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 shadow-sm">
            <button onClick={() => { setActiveUser(null); navigate('/chat'); }}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
              <ArrowLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>

            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden" style={{ background: getGradient(activeUser.name) }}>
                {activeUser.avatar
                  ? <img src={activeUser.avatar} alt={activeUser.name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                  : <img src={getDiceBearUrl(activeUser.name)} alt={activeUser.name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                }
              </div>
              {isUserOnline(activeUser._id) && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-gray-900" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 dark:text-white">{activeUser.name}</p>
              <p className="text-xs mt-0.5">
                {isTyping
                  ? <span className="text-emerald-500 font-medium">typing…</span>
                  : isUserOnline(activeUser._id)
                    ? <span className="text-emerald-500">Online</span>
                    : <span className="text-slate-400">Offline</span>
                }
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {[{PhoneIcon, VideoCameraIcon}].map((Icon, i) => (
                <button key={i} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors text-slate-500 hover:text-slate-700">
                  <Icon className="w-4.5 h-4.5" style={{ width:'18px', height:'18px' }} />
                </button>
              ))}
              <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors text-slate-500">
                <EllipsisVerticalIcon className="w-4.5 h-4.5" style={{ width:'18px', height:'18px' }} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4" style={{ background:'#f8fafc' }}>
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {Object.entries(msgsByDate).map(([dateLabel, msgs]) => (
                  <div key={dateLabel}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 font-medium shadow-sm">
                        {dateLabel}
                      </span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    {msgs.map((msg, i) => {
                      const isOwn = msg.sender?._id === user._id || msg.sender === user._id;
                      const showAvatar = !isOwn && (i === 0 || (msgs[i-1] && (msgs[i-1].sender?._id || msgs[i-1].sender) !== (msg.sender?._id || msg.sender)));
                      return (
                        <MessageBubble key={msg._id} message={msg} isOwn={isOwn}
                          showAvatar={showAvatar} sender={msg.sender} />
                      );
                    })}
                  </div>
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-gray-800">
            <div className="flex items-end gap-2 p-2 rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 focus-within:border-sky-400 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
              <input type="file" ref={fileRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />
              <button onClick={() => fileRef.current?.click()}
                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0">
                <PaperClipIcon className="w-5 h-5" />
              </button>
              <textarea ref={textareaRef} value={input} onChange={e => handleTyping(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message…" rows={1}
                className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none resize-none leading-5 py-1.5"
                style={{ maxHeight:'120px' }} />
              <button onClick={handleSend} disabled={!input.trim() || sending}
                className="p-2.5 rounded-xl text-white transition-all flex-shrink-0 disabled:opacity-40 active:scale-95"
                style={{ background:'linear-gradient(135deg,#0ea5e9,#0284c7)', boxShadow:'0 3px 10px rgb(14 165 233/.4)' }}>
                <PaperAirplaneIcon className="w-4.5 h-4.5" style={{ width:'18px', height:'18px' }} />
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-2">Press Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center" style={{ background:'#f8fafc' }}>
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg"
              style={{ background:'linear-gradient(135deg,#0ea5e9,#0284c7)', boxShadow:'0 10px 30px rgb(14 165 233/.3)' }}>
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <p className="font-heading font-bold text-slate-700 dark:text-slate-300 text-lg">Select a conversation</p>
            <p className="text-sm text-slate-400 mt-1">Choose a doctor or patient to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}