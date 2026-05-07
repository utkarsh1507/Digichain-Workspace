import { useEffect } from 'react';

export default function GoogleCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success') === '1';
    const error = params.get('error');

    if (window.opener) {
      window.opener.postMessage(
        { type: 'google-oauth', success, error: error || null },
        window.location.origin
      );
      window.close();
    } else {
      // Fallback if popup was blocked or opened in same tab
      document.body.innerHTML = success
        ? '<p style="font-family:sans-serif;padding:40px;text-align:center">Google account connected! You can close this tab.</p>'
        : `<p style="font-family:sans-serif;padding:40px;text-align:center;color:#e05c5c">Connection failed: ${error || 'unknown error'}. Close this tab and try again.</p>`;
    }
  }, []);

  return null;
}
