import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { useFirebaseYjs } from '../hooks/useFirebaseYjs';

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  const btnClass = (isActive) =>
    `px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${
      isActive 
        ? "bg-purple-600 text-white shadow-lg scale-95" 
        : "bg-slate-50 text-slate-400 hover:bg-purple-50 hover:text-purple-600"
    }`;

  return (
    <div className="flex flex-wrap gap-2 p-4 border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive("bold"))}>B</button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive("italic"))}>I</button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive("strike"))}>S</button>
      <div className="w-px h-6 bg-slate-200 mx-1"></div>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive("heading", { level: 1 }))}>H1</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive("heading", { level: 2 }))}>H2</button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive("bulletList"))}>List</button>
      <button 
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} 
        className="ml-auto px-4 py-2 rounded-xl text-[10px] font-black text-rose-400 hover:bg-rose-50 tracking-widest uppercase"
      >
        Clear
      </button>
    </div>
  );
};

export default function CollaborativeEditor({ roomId }) {
  const ydoc = useFirebaseYjs(roomId);

  const editor = useEditor({
    editable: true,
    extensions: [
      StarterKit.configure({ 
        history: false // CRITICAL: Prevents the "History Support" console warning
      }),
      ydoc ? Collaboration.configure({ document: ydoc }) : null,
    ].filter(Boolean),
    editorProps: {
      attributes: {
        // prose-purple makes links and lists match your dashboard theme
        class: 'prose prose-purple max-w-none focus:outline-none min-h-[400px] px-8 py-6 text-slate-700 leading-relaxed outline-none',
      },
    },
  }, [ydoc]); 

  if (!ydoc || !editor) {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-purple-50 h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Connecting Sync...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-purple-50 overflow-hidden flex flex-col h-full min-h-[500px] transition-all">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase italic">Shared Notes</h2>
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.4em] mt-1">
            Synced via Firestore
          </p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Active</span>
        </div>
      </div>

      <MenuBar editor={editor} />
      
      <div className="flex-grow bg-white overflow-y-auto cursor-text custom-scrollbar">
        <EditorContent editor={editor} />
      </div>

      {/* Internal CSS for Collaborative Cursors */}
      <style>{`
        .ProseMirror {
          min-height: 400px;
        }
        .collaboration-cursor__caret {
          border-left: 2px solid #9333ea;
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }
        .collaboration-cursor__label {
          background: #9333ea;
          border-radius: 4px 4px 4px 0;
          color: white;
          font-size: 10px;
          font-style: normal;
          font-weight: 700;
          left: -1px;
          line-height: normal;
          padding: 2px 6px;
          position: absolute;
          top: -1.4em;
          user-select: none;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}