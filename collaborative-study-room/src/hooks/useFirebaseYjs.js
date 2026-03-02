import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase'; 

export function useFirebaseYjs(roomId) {
  const [ydoc, setYdoc] = useState(null);

  // 1. Lifecycle Management: Create and Destroy the Yjs Doc safely
  useEffect(() => {
    const newDoc = new Y.Doc();
    setYdoc(newDoc);

    return () => {
      newDoc.destroy();
    };
  }, []); // Empty dependency array = runs once on mount

  // 2. Sync Logic: Only runs when ydoc is ready
  useEffect(() => {
    if (!roomId || !ydoc) return;

    const docRef = doc(db, 'rooms', roomId, 'notes', 'shared');

    // LISTEN (Firebase -> Yjs)
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) return;
      
      const data = snapshot.data();
      if (data?.update) {
        try {
          const updateArray = new Uint8Array(Object.values(data.update));
          Y.applyUpdate(ydoc, updateArray, 'remote');
        } catch (err) {
          console.error("Failed to apply update:", err);
        }
      }
    });

    // WRITE (Yjs -> Firebase)
    const handleUpdate = (update, origin) => {
      if (origin === 'remote') return;

      try {
        const fullState = Y.encodeStateAsUpdate(ydoc);
        // Convert to standard object for Firestore
        const updateObj = { ...fullState }; 
        setDoc(docRef, { update: updateObj }, { merge: true });
      } catch (err) {
        console.error("Failed to save update:", err);
      }
    };

    ydoc.on('update', handleUpdate);

    return () => {
      unsubscribe();
      ydoc.off('update', handleUpdate);
    };
  }, [roomId, ydoc]);

  return ydoc;
}