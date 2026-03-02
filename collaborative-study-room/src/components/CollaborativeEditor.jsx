import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { useFirebaseYjs } from '../hooks/useFirebaseYjs';

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  const btnClass = (isActive) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
      isActive 
        ? "bg-purple-600 text-white shadow-md" 
        : "bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-600"
    }`;

  return (
    <div className="flex flex-wrap gap-2 p-3 border-b border-slate-100 bg-slate-50/50">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive("bold"))}>B</button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive("italic"))}>I</button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive("strike"))}>S</button>
      <div className="w-px h-6 bg-slate-200 mx-1"></div>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive("heading", { level: 1 }))}>H1</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive("heading", { level: 2 }))}>H2</button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive("bulletList"))}>List</button>
    </div>
  );
};

export default function CollaborativeEditor({ roomId }) {
  const ydoc = useFirebaseYjs(roomId);

  const editor = useEditor({
    editable: true,
    extensions: [
      StarterKit.configure({ history: false }), // Let Yjs handle history
      // Critical: Only load Collaboration if ydoc exists
      ydoc ? Collaboration.configure({ document: ydoc }) : undefined,
    ].filter(Boolean), // Remove undefined extensions
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[400px] p-4 text-slate-700 leading-relaxed outline-none',
      },
    },
  }, [ydoc]); // Re-create editor when ydoc is ready

  // 3. Loading State
  if (!ydoc || !editor) {
    return (
      <div className="bg-white rounded-[2rem] shadow-xl border border-purple-50 h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Connecting Sync...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-purple-50 overflow-hidden flex flex-col h-full min-h-[500px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Shared Notes</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            Synced via Firestore
          </p>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-xs font-bold text-blue-600">Active</span>
        </div>
      </div>

      <MenuBar editor={editor} />
      
      <div className="flex-grow bg-white overflow-y-auto cursor-text custom-scrollbar">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}