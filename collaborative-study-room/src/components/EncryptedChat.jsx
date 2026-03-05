import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { encrypt, decrypt } from '../utils/crypto';
import { useAuth } from '../context/AuthContext';

export default function EncryptedChat({ roomId, roomCode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!roomId || !roomCode) return;

    const q = query(
      collection(db, 'rooms', roomId, 'messages'), // Using subcollection pattern
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Decrypt on the client using roomCode as the secret key
          text: decrypt(data.text, roomCode)
        };
      });
      setMessages(msgs);
      setLoading(false);
      
      // Auto-scroll to bottom smoothly
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsub();
  }, [roomId, roomCode]);

  async function sendMessage(e) {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || !roomCode) return;
    
    setInput('');
    
    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        senderId: user.uid,
        senderName: user.displayName || 'Scholar',
        text: encrypt(msg, roomCode), // AES encrypted before touching the database
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[2.5rem] shadow-xl flex flex-col h-[500px] overflow-hidden">
      
      {/* Header & Encryption Badge */}
      <div className="bg-black/20 p-4 border-b border-white/10">
        <h3 className="text-white font-black tracking-widest uppercase text-sm mb-1">Room Chat</h3>
        <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] font-bold tracking-widest uppercase">
          <span>🔒</span> E2E Encrypted
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {loading && <div className="text-center text-white/40 text-xs font-bold mt-4 animate-pulse">Decrypting messages...</div>}
        
        {messages.map((msg) => {
          const isMe = msg.senderId === user.uid;
          
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && (
                <span className="text-[10px] text-white/40 font-bold mb-1 ml-1">{msg.senderName}</span>
              )}
              <div 
                className={`px-4 py-2.5 max-w-[85%] text-sm font-medium shadow-md ${
                  isMe 
                    ? 'bg-purple-500 text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-white/10 text-white border border-white/10 rounded-2xl rounded-tl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-3 bg-black/20 border-t border-white/10 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Secure message..."
          className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl px-4 py-2 outline-none focus:border-purple-400 transition text-sm"
        />
        <button 
          type="submit"
          disabled={!input.trim()}
          className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/30 disabled:text-white/30 text-white w-10 h-10 rounded-xl flex items-center justify-center transition shadow-lg"
        >
          ➤
        </button>
      </form>
    </div>
  );
}