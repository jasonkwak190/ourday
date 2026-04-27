export default function sitemap() {
  const base = 'https://ourday-rust.vercel.app';
  return [
    { url: base,              lastModified: new Date(), changeFrequency: 'monthly',  priority: 1 },
    { url: `${base}/login`,   lastModified: new Date(), changeFrequency: 'yearly',   priority: 0.8 },
    { url: `${base}/signup`,  lastModified: new Date(), changeFrequency: 'yearly',   priority: 0.8 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'yearly',   priority: 0.5 },
  ];
}
