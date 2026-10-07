/** Genera una imagen placeholder neutra (SVG data URI) */
export function placeholder(label = '', w = 600, h = 600): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#eef2f8"/><g fill="none" stroke="#c3cddd" stroke-width="3"><rect x="${w / 2 - 40}" y="${h / 2 - 46}" width="80" height="62" rx="8"/><circle cx="${w / 2 - 14}" cy="${h / 2 - 24}" r="8"/><path d="M${w / 2 - 40} ${h / 2 + 6} l24 -20 l18 14 l14 -10 l24 18"/></g><text x="50%" y="${h / 2 + 52}" font-family="Inter,sans-serif" font-size="18" fill="#8a96ab" text-anchor="middle">${label}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
