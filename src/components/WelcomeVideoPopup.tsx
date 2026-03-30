import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';

function toEmbedUrl(url: string): string {
  if (!url) return '';
  // Handle youtube.com/watch?v=ID
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=0&controls=1&rel=0`;
  return url;
}

export default function WelcomeVideoPopup() {
  const { user, profile, refreshProfile } = useAuth();
  const [videoUrl, setVideoUrl] = useState('');
  const [currentVersion, setCurrentVersion] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;

    (async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['welcome_video_url', 'welcome_video_version']);

      const map: Record<string, string> = {};
      (data ?? []).forEach((s: { key: string; value: string | null }) => {
        map[s.key] = s.value ?? '';
      });

      const url = map.welcome_video_url ?? '';
      const version = parseInt(map.welcome_video_version ?? '0', 10) || 0;
      const userVersionSeen = (profile as Record<string, unknown>).welcome_video_version_seen as number ?? 0;

      setVideoUrl(url);
      setCurrentVersion(version);

      if (url && version > 0 && userVersionSeen < version) {
        setShow(true);
      }
    })();
  }, [user, profile]);

  const handleClose = async () => {
    setShow(false);
    if (user) {
      await supabase
        .from('profiles')
        .update({
          welcome_video_seen: true,
          welcome_video_version_seen: currentVersion,
        } as Record<string, unknown>)
        .eq('user_id', user.id);
      refreshProfile();
    }
  };

  if (!show || !videoUrl) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-lg overflow-hidden shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-background/80 border border-border text-foreground hover:bg-background transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="p-4 pb-0">
          <p className="text-sm font-semibold text-foreground">Welcome Video</p>
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
    </div>
  );
}
