import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { useFirebaseYjs } from '../hooks/useFirebaseYjs';

const MenuBar = ({ editor }) => {
  const [updated, setUpdated] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const updateHandler = () => setUpdated(s => s + 1);
    editor.on('transaction', updateHandler);
    return () => editor.off('transaction', updateHandler);
  }, [editor]);

  if (!editor) return null;

  const getBtnClass = (name, attributes = {}) => {
    const active = editor.isActive(name, attributes);
    return `px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-200 border ${
      active 
        ? "bg-purple-600 text-white border-purple-600 shadow-lg scale-95" 
        : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-purple-50 hover:text-purple-600"
    }`;
  };

  return (
    <div className="flex flex-wrap gap-2 p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={getBtnClass("bold")}>B</button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={getBtnClass("italic")}>I</button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={getBtnClass("strike")}>S</button>
      
      <div className="w-px h-6 bg-slate-200 mx-1"></div>
      
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={getBtnClass("heading", { level: 1 })}>H1</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={getBtnClass("heading", { level: 2 })}>H2</button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={getBtnClass("bulletList")}>List</button>
      
      <button 
        onClick={() => editor.chain().focus().clearContent(true).run()} 
        className="ml-auto px-4 py-2 rounded-xl text-[10px] font-black text-rose-500 hover:bg-rose-50 tracking-widest uppercase"
      >
        Clear
      </button>
    </div>
  );
};

export default function CollaborativeEditor({ roomId }) {
  const ydoc = useFirebaseYjs(roomId);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      ydoc ? Collaboration.configure({ document: ydoc }) : null,
    ].filter(Boolean),
    editorProps: {
      attributes: {
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
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-purple-50 overflow-hidden flex flex-col h-full min-h-[500px]">
      <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase italic">Shared Notes</h2>
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.4em] mt-1">Synced via Firestore</p>
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

      <style>{`
        .ProseMirror { min-height: 400px; outline: none !important; }
        .ProseMirror h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; color: #1e293b; }
        .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; color: #1e293b; }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
        .ProseMirror li { margin-bottom: 0.25em; color: #334155; }
      `}`</style>
    </div>
  );
}