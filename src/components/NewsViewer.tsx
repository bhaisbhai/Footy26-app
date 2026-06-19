import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Newspaper } from 'lucide-react';

export function NewsViewer() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then(data => {
         setArticles(data);
         setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || articles.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase px-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          Latest News
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article: any, idx: number) => (
          <motion.div 
             key={article.id || idx}
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.3, delay: idx * 0.1 }}
             className="bg-[#0f172a]/40 border border-white/5 rounded-[2rem] overflow-hidden group hover:border-white/20 transition-all cursor-pointer shadow-md"
             onClick={() => window.open(article.links?.web?.href, '_blank')}
          >
             {article.images && article.images.length > 0 && (
                <div className="w-full h-48 overflow-hidden relative">
                   <img src={article.images[0].url} alt={article.images[0].alt} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent opacity-80" />
                </div>
             )}
             <div className="p-6 relative z-10">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest bg-orange-400/10 px-2 py-1 rounded border border-orange-400/20 mb-4 inline-block">
                  {article.categories?.[0]?.description || 'News'}
                </span>
                <h3 className="text-lg font-bold text-white leading-snug mb-3 group-hover:text-orange-400 transition-colors">
                  {article.headline}
                </h3>
                <p className="text-xs text-white/50 leading-relaxed font-sans line-clamp-3">
                  {article.description}
                </p>
                <div className="mt-6 flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest font-bold">
                   <Newspaper className="w-3" />
                   {new Date(article.published).toLocaleDateString()}
                </div>
             </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
