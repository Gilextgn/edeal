import messages from "../../../messages/fr.json";

export const dynamic = "force-static";

// Page de secours servie par le service worker. Elle est autonome
// (styles en ligne) car aucun autre fichier n'est garanti en cache.
export function GET() {
  const { app, offline } = messages;
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${app.name}</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 16px; padding: 24px;
    font-family: system-ui, sans-serif; text-align: center;
    background: #0b0b0d; color: #ffffff; }
  h1 { margin: 0; font-size: 22px; }
  p { margin: 0; font-size: 16px; }
  a { display: inline-flex; align-items: center; justify-content: center;
    min-height: 48px; padding: 0 24px; border-radius: 12px; font-weight: 600;
    background: #e0a800; color: #2a1e00; text-decoration: none; }
</style>
</head>
<body>
<h1>${offline.title}</h1>
<p>${offline.body}</p>
<a href="/">${offline.retry}</a>
</body>
</html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
