export function GET() {
  return new Response('google-site-verification: google61df5c33f3fbcd72.html', {
    headers: { 'Content-Type': 'text/html' },
  })
}
