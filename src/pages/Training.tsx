import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Video } from 'lucide-react';

interface TrainingVideo {
  id: string;
  title: string;
  youtube_url: string;
  is_active: boolean;
  created_at: string;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  return match ? match[1] : null;
}

export default function Training() {
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['training-videos'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('training_videos') as any)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TrainingVideo[];
    },
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-primary/15 border border-primary/25 flex items-center justify-center">
            <Video className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Training</h1>
            <p className="text-xs text-foreground-muted">Learn how to use EngagefeX effectively</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i} className="border-border bg-surface">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="w-full aspect-video rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <Card className="border-border bg-surface">
            <CardContent className="py-12 text-center">
              <Video className="w-8 h-8 text-foreground-muted mx-auto mb-2" />
              <p className="text-sm text-foreground-muted">No training videos available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((v) => {
              const videoId = extractYouTubeId(v.youtube_url);
              return (
                <Card key={v.id} className="border-border bg-surface">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">{v.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {videoId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title={v.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full aspect-video rounded"
                      />
                    ) : (
                      <p className="text-xs text-foreground-muted">Invalid video URL</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
