import React, { useState, useRef, useEffect } from 'react';
import {
  SparklesIcon, PaperAirplaneIcon, PlusIcon, TrashIcon,
  ExclamationTriangleIcon, HeartIcon, BeakerIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { aiAPI } from '../services/api';
import useAuthStore from '../context/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const QUICK_PROMPTS = [
  { label: 'Symptom Check', icon: HeartIcon, text: 'I have a headache, fever, and sore throat. What could this be?' },
  { label: 'Medicine Info', icon: BeakerIcon, text: 'What are common side effects of Ibuprofen?' },
  { label: 'Health Advice', icon: SparklesIcon, text: 'Give me tips for improving my sleep quality.' },
  { label: 'Appointment?', icon: ClockIcon, text: 'When should I see a doctor vs wait it out?' },
];

const MessageBubble = ({ msg }) => {
  const isAI = msg.role === 'assistant';
  return (
    <div className={`flex gap-3 mb-4 ${isAI ? '' : 'flex-row-reverse'}`}>
      {isAI ? (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <SparklesIcon className="w-4 h-4 text-white" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-semibold">You</span>
        </div>
      )}
      <div className={`max-w-[80%] ${isAI ? '' : 'items-end flex flex-col'}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isAI
            ? 'bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'
            : 'bg-primary-600 text-white rounded-tr-sm'
        }`}>
          {msg.loading ? (
            <div className="flex gap-1 items-center py-1">
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          )}
        </div>
        <p className={`text-[10px] mt-1 ${isAI ? 'text-slate-400' : 'text-slate-400 text-right'}`}>
          {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
        </p>
      </div>
    </div>
  );
};

export default function AIAssistantPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([
    {
      id: 1, role: 'assistant',
      content: `Hello ${user?.name?.split(' ')[0]}! 👋 I'm HealthAssist AI, your personal healthcare assistant.\n\nI can help you with:\n• Symptom checking and health guidance\n• Medicine information\n• Healthy lifestyle advice\n• When to seek medical attention\n\n⚠️ I provide general health information only — always consult a licensed doctor for medical diagnosis and treatment.\n\nHow can I help you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [symptomMode, setSymptomMode] = useState(false);
  const [symptoms, setSymptoms] = useState([]);
  const [symptomInput, setSymptomInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text = input) => {
    if (!text.trim() || loading) return;
    const userMsg = { id: Date.now(), role: 'user', content: text.trim(), timestamp: new Date() };
    const loadingMsg = { id: Date.now() + 1, role: 'assistant', loading: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setLoading(true);

    const history = messages.filter(m => !m.loading).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', content: m.content }));

    try {
      const { data } = await aiAPI.chat({ message: text.trim(), history });
      setMessages(prev => prev.map(m => m.id === loadingMsg.id
        ? { ...m, loading: false, content: data.response }
        : m
      ));
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === loadingMsg.id
        ? { ...m, loading: false, content: 'I apologize, I\'m having trouble connecting right now. Please try again or contact our support team.' }
        : m
      ));
    } finally { setLoading(false); }
  };

  const analyzeSymptoms = async () => {
    if (symptoms.length === 0) return;
    setSymptomMode(false);
    const text = `Please analyze these symptoms: ${symptoms.join(', ')}`;
    const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: new Date() };
    const loadingMsg = { id: Date.now() + 1, role: 'assistant', loading: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setLoading(true);
    try {
      const { data } = await aiAPI.analyzeSymptoms({
        symptoms,
        age: user?.dateOfBirth ? Math.floor((new Date() - new Date(user.dateOfBirth)) / 31557600000) : null,
        gender: user?.gender,
      });
      setMessages(prev => prev.map(m => m.id === loadingMsg.id
        ? { ...m, loading: false, content: data.analysis?.analysis || 'Unable to analyze symptoms at this time.' }
        : m
      ));
    } catch (e) {
      toast.error('Symptom analysis failed');
      setMessages(prev => prev.filter(m => m.id !== loadingMsg.id));
    } finally { setLoading(false); setSymptoms([]); }
  };

  const clearChat = () => {
    setMessages([{
      id: 1, role: 'assistant',
      content: 'Chat cleared. How can I help you today?',
      timestamp: new Date(),
    }]);
  };

  const addSymptom = () => {
    if (symptomInput.trim() && !symptoms.includes(symptomInput.trim())) {
      setSymptoms(prev => [...prev, symptomInput.trim()]);
      setSymptomInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-4 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-slate-900 dark:text-white">HealthAssist AI</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Gemini AI</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSymptomMode(!symptomMode)}
            className={`btn-secondary text-xs ${symptomMode ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : ''}`}>
            <HeartIcon className="w-4 h-4" />
            Symptom Checker
          </button>
          <button onClick={clearChat} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Symptom Checker Panel */}
      {symptomMode && (
        <div className="mx-4 mt-4 p-4 card bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 animate-slide-up">
          <h3 className="font-semibold text-sm text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
            <HeartIcon className="w-4 h-4" /> Symptom Analyzer
          </h3>
          <div className="flex gap-2 mb-3">
            <input type="text" value={symptomInput} onChange={e => setSymptomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSymptom()}
              placeholder="Type a symptom (e.g. headache)..."
              className="input flex-1 text-sm" />
            <button onClick={addSymptom} className="btn-primary flex-shrink-0">
              <PlusIcon className="w-4 h-4" /> Add
            </button>
          </div>
          {symptoms.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {symptoms.map(s => (
                <span key={s} className="badge bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300 gap-1.5">
                  {s}
                  <button onClick={() => setSymptoms(prev => prev.filter(x => x !== s))} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={analyzeSymptoms} disabled={symptoms.length === 0} className="btn-primary">
              <SparklesIcon className="w-4 h-4" /> Analyze Symptoms
            </button>
            <button onClick={() => { setSymptomMode(false); setSymptoms([]); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-4 lg:px-6 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {QUICK_PROMPTS.map(({ label, icon: Icon, text }) => (
            <button key={label} onClick={() => sendMessage(text)}
              className="flex items-center gap-2 p-3 card hover:shadow-md transition-all text-left group text-sm">
              <Icon className="w-4 h-4 text-primary-500 flex-shrink-0" />
              <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4">
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        <div ref={messagesEndRef} />
      </div>

      {/* Disclaimer */}
      <div className="px-4 lg:px-6 pb-2">
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <ExclamationTriangleIcon className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-yellow-700 dark:text-yellow-400">
            AI responses are for informational purposes only. Always consult a licensed healthcare professional for medical advice, diagnosis, or treatment.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="px-4 lg:px-6 pb-4 pt-2 bg-white dark:bg-gray-800 border-t border-slate-200 dark:border-gray-700">
        <div className="flex items-end gap-2">
          <textarea
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about symptoms, medications, health tips..."
            rows={1} className="input flex-1 resize-none py-2.5 leading-5"
            style={{ maxHeight: '120px' }}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className="p-2.5 bg-gradient-to-br from-purple-500 to-primary-600 hover:opacity-90 disabled:opacity-40 text-white rounded-xl transition-all flex-shrink-0 shadow-md">
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
