import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // If there is no update, don't show anything
  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-slate-900 border border-purple-500 rounded-xl p-4 shadow-2xl flex flex-col gap-3 text-white max-w-sm animate-fade-in-up">
      <div className="flex items-start gap-3">
        <span className="text-2xl">✨</span>
        <div>
          <h3 className="font-bold text-sm">
            {offlineReady ? "App ready to work offline" : "New Update Available!"}
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            {offlineReady 
              ? "You can now use some features without an internet connection." 
              : "A new version of the study room is ready. Click reload to update."}
          </p>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button 
          onClick={close}
          className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
        >
          Dismiss
        </button>
        {needRefresh && (
          <button 
            onClick={() => updateServiceWorker(true)}
            className="px-4 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition"
          >
            Reload App
          </button>
        )}
      </div>
    </div>
  );
}

export default UpdatePrompt;