import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Trash2, Pencil, Plus, Video, ExternalLink } from 'lucide-react';

interface TrainingVideo {
  id: string;
  title: string;
  youtube_url: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/;

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  return match ? match[1] : null;
}

export default function AdminTrainingVideos() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['admin-training-videos'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('training_videos') as any)
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TrainingVideo[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !youtubeUrl.trim()) throw new Error('Title and URL required');
      if (!YOUTUBE_REGEX.test(youtubeUrl.trim())) throw new Error('Invalid YouTube URL');

      if (editingId) {
        const { error } = await (supabase.from('training_videos') as any)
          .update({ title: title.trim(), youtube_url: youtubeUrl.trim(), is_active: isActive, display_order: displayOrder })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('training_videos') as any)
          .insert({ title: title.trim(), youtube_url: youtubeUrl.trim(), is_active: isActive, display_order: displayOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Video updated' : 'Video added');
      queryClient.invalidateQueries({ queryKey: ['admin-training-videos'] });
      queryClient.invalidateQueries({ queryKey: ['training-videos'] });
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('training_videos') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Video deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-training-videos'] });
      queryClient.invalidateQueries({ queryKey: ['training-videos'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const resetForm = () => {
    setTitle('');
    setYoutubeUrl('');
    setIsActive(true);
    setDisplayOrder(0);
    setEditingId(null);
  };

  const startEdit = (v: TrainingVideo) => {
    setTitle(v.title);
    setYoutubeUrl(v.youtube_url);
    setIsActive(v.is_active);
    setDisplayOrder(v.display_order);
    setEditingId(v.id);
  };

  return (
    <div className="space-y-5">
      {/* Form */}
      <Card className="border-border bg-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {editingId ? 'Edit Training Video' : 'Add Training Video'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Video Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. How to create a campaign"
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">YouTube URL</Label>
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="bg-background"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Display Order</Label>
            <Input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="bg-background w-32"
              min={0}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label className="text-xs">Active</Label>
            </div>
            <div className="flex gap-2">
              {editingId && (
                <Button variant="outline" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {editingId ? 'Update Video' : 'Add Video'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-border bg-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Training Videos ({videos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-foreground-muted">Loading...</p>
          ) : videos.length === 0 ? (
            <p className="text-xs text-foreground-muted">No training videos yet.</p>
          ) : (
            <div className="space-y-2">
              {videos.map((v) => {
                const videoId = extractYouTubeId(v.youtube_url);
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 p-3 rounded border border-border bg-background"
                  >
                    {videoId && (
                      <img
                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                        alt={v.title}
                        className="w-20 h-12 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{v.title}</p>
                      <p className="text-xs text-foreground-muted truncate">{v.youtube_url}</p>
                    </div>
                    <span className="text-xs font-mono text-foreground-muted px-1.5">#{v.display_order}</span>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded ${
                        v.is_active
                          ? 'bg-earn/10 text-earn'
                          : 'bg-foreground-muted/10 text-foreground-muted'
                      }`}
                    >
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(v)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-spend hover:text-spend"
                        onClick={() => deleteMutation.mutate(v.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
