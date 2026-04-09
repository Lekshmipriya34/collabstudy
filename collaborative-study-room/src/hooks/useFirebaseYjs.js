import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { doc, collection, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function useFirebaseYjs(roomId, currentUser) {
  const [ydoc, setYdoc]           = useState(null);
  const [awareness, setAwareness] = useState(null);

  // ── 1. Create Y.Doc + Awareness ──────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !currentUser?.uid) return;
    const newDoc       = new Y.Doc();
    const newAwareness = new Awareness(newDoc);
    setYdoc(newDoc);
    setAwareness(newAwareness);
    return () => {
      newAwareness.destroy();
      newDoc.destroy();
      setYdoc(null);
      setAwareness(null);
    };
  }, [roomId, currentUser?.uid]);

  // ── 2. Firestore ↔ Yjs document sync ─────────────────────────────────────
  useEffect(() => {
    if (!roomId || !ydoc) return;
    const docRef = doc(db, 'rooms', roomId, 'notes', 'shared');

    const unsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data?.update) {
        try {
          Y.applyUpdate(ydoc, new Uint8Array(Object.values(data.update)), 'remote');
        } catch (e) { console.error('apply update failed', e); }
      }
    });

    const handleUpdate = (_u, origin) => {
      if (origin === 'remote') return;
      try {
        setDoc(docRef, { update: { ...Y.encodeStateAsUpdate(ydoc) } }, { merge: true });
      } catch (e) { console.error('save update failed', e); }
    };
    ydoc.on('update', handleUpdate);
    return () => { unsub(); ydoc.off('update', handleUpdate); };
  }, [roomId, ydoc]);

  // ── 3. Firestore cursor sync ──────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !awareness || !currentUser?.uid) return;
    const uid        = currentUser.uid;
    const myRef      = doc(db, 'rooms', roomId, 'cursors', uid);
    const cursorsCol = collection(db, 'rooms', roomId, 'cursors');

    // Seed our own user info
    awareness.setLocalState({ user: currentUser, clientID: awareness.clientID });

    // Push local changes → Firestore
    const handleChange = ({ updated }) => {
      if (!updated.includes(awareness.clientID)) return;
      const state = awareness.getLocalState();
      if (state) {
        setDoc(myRef, { state: { ...state, clientID: awareness.clientID }, uid }, { merge: true })
          .catch(console.error);
      }
    };
    awareness.on('change', handleChange);

    // Pull remote cursors → awareness
    const unsub = onSnapshot(cursorsCol, (snap) => {
      const added = [], updated = [], removed = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!data.uid || data.uid === uid) return;
        const remoteClientID = data.state?.clientID;
        if (remoteClientID == null) return;
        awareness.states.set(remoteClientID, data.state);
        updated.push(remoteClientID);
      });
      awareness.states.forEach((_, clientID) => {
        if (clientID === awareness.clientID) return;
        const stillHere = snap.docs.some(d => d.data().state?.clientID === clientID);
        if (!stillHere) { awareness.states.delete(clientID); removed.push(clientID); }
      });
      if (added.length || updated.length || removed.length) {
        awareness.emit('change', [{ added, updated, removed }, 'remote']);
      }
    });

    return () => {
      awareness.off('change', handleChange);
      unsub();
      deleteDoc(myRef).catch(() => {});
      awareness.setLocalState(null);
    };
  }, [roomId, awareness, currentUser]);

  return { ydoc, awareness };
}