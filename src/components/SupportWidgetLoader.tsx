import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches the support widget script from platform_settings and
 * injects it into <head> once if not already present.
 */
export default function SupportWidgetLoader() {
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'support_widget_script')
        .maybeSingle();

      const script = data?.value?.trim();
      if (!script) return;
      if (document.getElementById('support-widget-script')) return;

      // Parse out the src from a <script ...> tag if user pasted full tag
      const srcMatch = script.match(/src=["']([^"']+)["']/);
      if (srcMatch) {
        const el = document.createElement('script');
        el.id = 'support-widget-script';
        el.src = srcMatch[1];
        el.async = true;
        // Pass any data attributes from original tag
        const dataAttrs = [...script.matchAll(/data-([\w-]+)=["']([^"']*)["']/g)];
        dataAttrs.forEach(([, name, value]) => el.setAttribute(`data-${name}`, value));
        document.head.appendChild(el);
      } else {
        // Raw JS snippet — wrap in script tag
        const el = document.createElement('script');
        el.id = 'support-widget-script';
        el.textContent = script;
        document.head.appendChild(el);
      }
    })();
  }, []);

  return null;
}
