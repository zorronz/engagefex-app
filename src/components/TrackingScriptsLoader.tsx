import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches tracking script settings from platform_settings and
 * injects GA, FB Pixel, and custom head/body scripts globally on load.
 */
export default function TrackingScriptsLoader() {
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['ga_id', 'fb_pixel_id', 'custom_head_script', 'custom_body_script']);

      if (!data?.length) return;

      const map: Record<string, string> = {};
      data.forEach(({ key, value }) => { if (value) map[key] = value.trim(); });

      // Google Analytics (gtag.js)
      if (map.ga_id && !document.getElementById('tracking-ga')) {
        const gtagScript = document.createElement('script');
        gtagScript.id = 'tracking-ga';
        gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${map.ga_id}`;
        gtagScript.async = true;
        document.head.appendChild(gtagScript);

        const gtagInit = document.createElement('script');
        gtagInit.id = 'tracking-ga-init';
        gtagInit.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${map.ga_id}');`;
        document.head.appendChild(gtagInit);
      }

      // Facebook Pixel
      if (map.fb_pixel_id && !document.getElementById('tracking-fb-pixel')) {
        const fbScript = document.createElement('script');
        fbScript.id = 'tracking-fb-pixel';
        fbScript.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${map.fb_pixel_id}');fbq('track','PageView');`;
        document.head.appendChild(fbScript);
      }

      // Custom head script
      if (map.custom_head_script && !document.getElementById('tracking-custom-head')) {
        const srcMatch = map.custom_head_script.match(/src=["']([^"']+)["']/);
        if (srcMatch) {
          const el = document.createElement('script');
          el.id = 'tracking-custom-head';
          el.src = srcMatch[1];
          el.async = true;
          document.head.appendChild(el);
        } else {
          const el = document.createElement('script');
          el.id = 'tracking-custom-head';
          el.textContent = map.custom_head_script.replace(/<\/?script[^>]*>/gi, '');
          document.head.appendChild(el);
        }
      }

      // Custom body script (inject before </body>)
      if (map.custom_body_script && !document.getElementById('tracking-custom-body')) {
        const srcMatch = map.custom_body_script.match(/src=["']([^"']+)["']/);
        if (srcMatch) {
          const el = document.createElement('script');
          el.id = 'tracking-custom-body';
          el.src = srcMatch[1];
          el.async = true;
          document.body.appendChild(el);
        } else {
          const el = document.createElement('script');
          el.id = 'tracking-custom-body';
          el.textContent = map.custom_body_script.replace(/<\/?script[^>]*>/gi, '');
          document.body.appendChild(el);
        }
      }
    })();
  }, []);

  return null;
}
