import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

function toEmbedUrl(url: string): string {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=0&controls=1&rel=0`;
  return url;
}

export default function WelcomeVideoCard() {
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('key, value')
        .eq('key', 'welcome_video_url')
        .maybeSingle();
      if (data?.value) setVideoUrl(data.value);
    })();
  }, []);

  if (!videoUrl) return null;

  return (
    <div className="bg-surface border border-border rounded">
      <div className="px-4 py-3 border-b border-border-subtle">
        <p className="label-caps">WELCOME VIDEO</p>
      </div>
      <div className="p-4">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={toEmbedUrl(videoUrl)}
            title="Welcome Video"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full rounded"
          />
        </div>
      </div>
    </div>
  );
}
