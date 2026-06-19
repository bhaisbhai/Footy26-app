import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, Image as ImageIcon, Sparkles, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export function FantasyAssistant() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [recommendation, setRecommendation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setMimeType(file.type);
        setRecommendation('');
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const getRecommendations = async () => {
    if (!image) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/fantasy-recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: image,
          mimeType
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get recommendations');
      }
      
      setRecommendation(data.recommendation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setImage(null);
    setMimeType('');
    setRecommendation('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-400" />
          Fantasy Assistant
        </h2>
        <p className="text-white/60">Upload a screenshot of your fantasy football squad to get AI-powered tactical advice and transfer recommendations.</p>
      </div>

      <div className="bg-[#0a101a] border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col gap-6 relative">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm mb-2">
            {error}
          </div>
        )}

        {!image ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/20 hover:border-purple-400/50 hover:bg-purple-400/5 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors"
          >
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-white/40" />
            </div>
            <div className="text-center">
              <p className="text-white/80 font-medium">Click or drag image to upload</p>
              <p className="text-white/40 text-sm mt-1">Supports taking a screenshot of your team</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/50">
              <img src={image} alt="Uploaded team" className="max-h-[300px] w-auto mx-auto object-contain" />
              <button 
                onClick={resetForm}
                className="absolute top-4 right-4 bg-black/60 hover:bg-red-500/80 text-white p-2 rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!recommendation && (
              <button
                onClick={getRecommendations}
                disabled={loading}
                className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-3 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Squad...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Get Recommendations
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {recommendation && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-white/5 border border-purple-500/20 rounded-xl p-6"
          >
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI Tactical Analysis
            </h3>
            <div className="markdown-body prose prose-invert prose-purple max-w-none text-white/80">
              <ReactMarkdown>{recommendation}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
