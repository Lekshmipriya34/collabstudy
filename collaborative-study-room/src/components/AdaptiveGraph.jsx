import { useEffect, useState } from "react";

function AdaptiveGraph() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimate(true), 200);
  }, []);

  return (
    <div className="mb-6 bg-white/50 border border-white/40 p-5 rounded-2xl backdrop-blur-sm">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">
            Retention Efficacy
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Standard Review vs. Adaptive SM-2
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-emerald-600">+34%</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Score Improvement</p>
        </div>
      </div>

      {/* THE GRAPH */}
      <div className="relative h-32 w-full mt-4 flex items-end justify-between gap-4">
        
        {/* Standard Bar */}
        <div className="w-1/2 flex flex-col justify-end h-full group">
          <div className="relative w-full bg-slate-200 rounded-t-xl overflow-hidden">
             <div 
               className={`absolute bottom-0 w-full bg-slate-400 transition-all duration-1000 ease-out ${animate ? 'h-[55%]' : 'h-0'}`} 
             />
          </div>
          <p className="text-center text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">Standard</p>
        </div>

        {/* Adaptive Bar */}
        <div className="w-1/2 flex flex-col justify-end h-full relative">
           {/* Floating Label */}
           <div className={`absolute top-0 left-1/2 -translate-x-1/2 -mt-8 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg transition-opacity duration-700 delay-1000 ${animate ? 'opacity-100' : 'opacity-0'}`}>
             SM-2 ALGORITHM
           </div>

          <div className="relative w-full bg-emerald-100 rounded-t-xl overflow-hidden">
             <div 
               className={`absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 to-teal-400 transition-all duration-1000 ease-out delay-300 ${animate ? 'h-[89%]' : 'h-0'}`} 
             />
          </div>
          <p className="text-center text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-wider">Adaptive</p>
        </div>
      </div>
    </div>
  );
}

export default AdaptiveGraph;