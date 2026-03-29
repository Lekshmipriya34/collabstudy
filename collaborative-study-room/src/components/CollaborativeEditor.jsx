import { useMemo, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { useAuth } from '../context/AuthContext';
import { useFirebaseYjs } from '../hooks/useFirebaseYjs';

const CURSOR_COLORS = ['#8B5CF6', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#EC4899'];

function getUserColor(uid) {
  return CURSOR_COLORS[
    [...(uid || '')].reduce((acc, c) => acc + c.charCodeAt(0), 0) % CURSOR_COLORS.length
  ];
}

const MenuBar = ({ editor }) => {
  if (!editor) return null;
  const btnClass = (isActive) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
      isActive
        ? 'bg-purple-600 text-white shadow-md'
        : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-600'
    }`;
  return (
    <div className="flex flex-wrap gap-2 p-3 border-b border-slate-100 bg-slate-50/50">
      <button onClick={() => editor.chain().focus().toggleBold().run()}      className={btnClass(editor.isActive('bold'))}>B</button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()}    className={btnClass(editor.isActive('italic'))}>I</button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()}    className={btnClass(editor.isActive('strike'))}>S</button>
      <div className="w-px h-6 bg-slate-200 mx-1" />
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive('heading', { level: 1 }))}>H1</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))}>H2</button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))}>List</button>
    </div>
  );
};

// Shows live avatars of who's currently in the editor
function ActiveUsers({ awareness }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!awareness) return;

    const update = () => {
      const all = [];
      awareness.getStates().forEach((state) => {
        if (state?.user) all.push(state.user);
      });
      setUsers(all);
    };

    update();
    awareness.on('change', update);
    return () => awareness.off('change', update);
  }, [awareness]);

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {users.map((u, i) => (
        <div
          key={i}
          className="flex items-center gap-1.5 px-2 py-1 rounded-full text-white text-[10px] font-bold"
          style={{ backgroundColor: u.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-pulse" />
          {u.name}
        </div>
      ))}
    </div>
  );
}

function EditorInner({ ydoc, awareness }) {
  const editor = useEditor({
    editable: true,
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
      // No CollaborationCursor — it requires a live WebSocket provider
    ],
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[400px] p-4 text-slate-700 leading-relaxed outline-none',
      },
    },
  });

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-purple-50 overflow-hidden flex flex-col h-full min-h-[500px]">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Shared Notes</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Synced via Firestore</p>
        </div>
        <div className="flex items-center gap-3">
          <ActiveUsers awareness={awareness} />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-bold text-blue-600">Live</span>
          </div>
        </div>
      </div>
      <MenuBar editor={editor} />
      <div className="flex-grow bg-white overflow-y-auto cursor-text custom-scrollbar">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default function CollaborativeEditor({ roomId }) {
  const { user } = useAuth();

  const currentUser = useMemo(() => {
    if (!user) return null;
    return {
      uid:   user.uid,
      name:  user.displayName || user.email?.split('@')[0] || 'Scholar',
      color: getUserColor(user.uid),
    };
  }, [user]);

  const { ydoc, awareness } = useFirebaseYjs(roomId, currentUser) || {};

  if (!ydoc || !awareness) {
    return (
      <div className="bg-white rounded-[2rem] shadow-xl border border-purple-50 h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Connecting…</p>
        </div>
      </div>
    );
  }

  return <EditorInner key={roomId} ydoc={ydoc} awareness={awareness} />;
}