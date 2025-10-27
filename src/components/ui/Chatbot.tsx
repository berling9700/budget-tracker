import React, { useState, useEffect, useRef } from 'react';
import { Asset, Budget, Liability } from '../../../types';
import { getFinancialAdvice } from '../../services/geminiChatService';
import { Spinner } from './Spinner';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

interface ChatbotProps {
    page: string;
    budgets: Budget[];
    assets: Asset[];
    liabilities: Liability[];
}

export const Chatbot: React.FC<ChatbotProps> = ({ page, budgets, assets, liabilities }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    useEffect(() => {
        if(isOpen) {
            const pageName = page.charAt(0).toUpperCase() + page.slice(1);
            setMessages([{
                sender: 'ai',
                text: `Hello! I'm your AI financial assistant. How can I help you with your ${pageName} today? You can ask me things like "Give me some advice" or "Summarize my finances".`
            }]);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, page]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const userMessage = input.trim();
        if (!userMessage || isLoading) return;

        setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
        setInput('');
        setIsLoading(true);

        try {
            const aiResponse = await getFinancialAdvice(userMessage, page, budgets, assets, liabilities);
            setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { sender: 'ai', text: `Sorry, I encountered an error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 z-50"
                aria-label="Open AI Chat"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M4.804 21.642c.42.123.86.043 1.22-.21l3.96-2.772a7.5 7.5 0 0 1 4.266.002l3.96 2.772c.36.252.8.332 1.22.21a.75.75 0 0 0 .542-.825l-1.09-4.46a7.5 7.5 0 1 1-12.9 0l-1.09 4.46a.75.75 0 0 0 .542.825ZM5.25 12a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" clipRule="evenodd" />
                    <path d="M11.25 9a.75.75 0 0 0-1.5 0v1.5a.75.75 0 0 0 1.5 0V9Zm3-1.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V8.25a.75.75 0 0 1 .75-.75Zm-6 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V8.25a.75.75 0 0 1 .75-.75Z" />
                </svg>
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={() => setIsOpen(false)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        className="fixed bottom-6 right-6 w-[90vw] max-w-lg h-[70vh] bg-slate-800 rounded-xl shadow-2xl flex flex-col"
                    >
                        <header className="flex justify-between items-center p-4 border-b border-slate-700">
                            <h3 className="text-lg font-bold">AI Financial Assistant</h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </header>
                        <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                        <MarkdownRenderer text={msg.text} />
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="px-4 py-2 rounded-2xl bg-slate-700 text-slate-200 rounded-bl-none">
                                        <Spinner size="sm" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleSend} className="p-4 border-t border-slate-700">
                            <div className="flex items-center bg-slate-700 rounded-lg">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Ask a question..."
                                    className="w-full bg-transparent p-3 focus:outline-none"
                                    disabled={isLoading}
                                />
                                <button type="submit" disabled={isLoading || !input.trim()} className="p-3 text-purple-400 disabled:text-slate-500 disabled:cursor-not-allowed">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};