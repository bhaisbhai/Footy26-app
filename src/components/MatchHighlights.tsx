import React, { useState, useEffect } from 'react';
import { Loader2, PlayCircle, AlertCircle } from 'lucide-react';

export function MatchHighlights({ matchName }: { matchName: string }) {
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    fetch(`/api/highlights?q=${encodeURIComponent(matchName)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        if (data.items && data.items.length > 0) {
          setVideo(data.items[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Highlights currently unavailable.');
        setLoading(false);
      });
  }, [matchName]);

  if (loading) {
    return (
       <div className="flex flex-col items-center justify-center p-8 text-white/50 space-y-4">
         <Loader2 className="w-8 h-8 animate-spin text-white/20" />
         <span className="text-xs font-mono uppercase tracking-widest">Searching Archives...</span>
       </div>
    );
  }

  if (error || !video) {
    return (
       <div className="flex flex-col items-center justify-center p-8 text-white/50 space-y-4">
         <AlertCircle className="w-8 h-8 text-white/20" />
         <span className="text-xs font-mono uppercase tracking-widest">{error || "No official highlights found"}</span>
       </div>
    );
  }

  const snippet = video.snippet;
  const videoId = video.id.videoId;

  if (playing) {
    return (
      <div className="w-full max-w-3xl aspect-video rounded-2xl overflow-hidden shadow-2xl relative bg-black">
         <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={snippet.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0"
        />
      </div>
    );
  }

  return (
    <div 
      onClick={() => setPlaying(true)}
      className="w-full max-w-3xl aspect-video relative rounded-2xl overflow-hidden cursor-pointer group shadow-2xl bg-black border border-white/10"
    >
       <img 
          src={snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url} 
          alt={snippet.title}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 scale-100 group-hover:scale-105"
       />
       
       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-6">
          <div className="flex justify-end">
             <span className="bg-red-600 text-white text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-sm flex items-center gap-1">
               BBC Sport
             </span>
          </div>

          <div className="flex items-end gap-6">
             <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-red-600 transition-colors transform group-hover:scale-110 duration-300">
               <PlayCircle className="w-8 h-8 text-white ml-1 group-hover:text-white" />
             </div>
             
             <div className="flex-1">
                <h3 className="text-xl md:text-3xl font-black text-white leading-tight line-clamp-2 drop-shadow-lg mb-2">
                  {snippet.title}
                </h3>
             </div>
          </div>
       </div>
    </div>
  );
}
