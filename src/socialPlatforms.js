const platforms = [
  { hosts: ['instagram.com', 'www.instagram.com'], name: 'Instagram', logo: '/logos/instagram.svg' },
  { hosts: ['youtube.com', 'www.youtube.com', 'youtu.be'], name: 'YouTube', logo: '/logos/youtube.svg' },
  { hosts: ['linkedin.com', 'www.linkedin.com'], name: 'LinkedIn', logo: '/logos/linkedin.svg' },
  { hosts: ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'], name: 'X', logo: '/logos/x.svg' },
  { hosts: ['github.com', 'www.github.com'], name: 'GitHub', logo: '/logos/github.svg' },
  { hosts: ['facebook.com', 'www.facebook.com', 'fb.com'], name: 'Facebook', logo: '/logos/facebook.svg' },
  { hosts: ['tiktok.com', 'www.tiktok.com'], name: 'TikTok', logo: '/logos/tiktok.svg' },
  { hosts: ['discord.gg', 'discord.com', 'www.discord.com'], name: 'Discord', logo: '/logos/discord.svg' },
  { hosts: ['twitch.tv', 'www.twitch.tv'], name: 'Twitch', logo: '/logos/twitch.svg' },
  { hosts: ['medium.com', 'www.medium.com'], name: 'Medium', logo: '/logos/medium.svg' },
  { hosts: ['dribbble.com', 'www.dribbble.com'], name: 'Dribbble', logo: '/logos/dribbble.svg' },
  { hosts: ['behance.net', 'www.behance.net'], name: 'Behance', logo: '/logos/behance.svg' },
  { hosts: ['spotify.com', 'www.spotify.com', 'open.spotify.com'], name: 'Spotify', logo: '/logos/spotify.svg' },
];

export function getSocialPlatform(url) {
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const hostname = new URL(fullUrl).hostname.toLowerCase();
    const match = platforms.find(p => p.hosts.includes(hostname));
    if (match) return { name: match.name, logo: match.logo };
    return { name: hostname.replace('www.', ''), logo: null };
  } catch {
    return { name: url, logo: null };
  }
}

export function getSocialTooltip(url, firstName) {
  const { name } = getSocialPlatform(url);
  const displayName = firstName || 'this user';
  if (['Instagram', 'YouTube', 'LinkedIn', 'GitHub', 'Facebook', 'TikTok', 'Twitch', 'Dribbble', 'Behance', 'Spotify', 'Medium'].includes(name)) {
    return `${displayName}'s ${name}`;
  }
  if (name === 'X') return `${displayName} on X`;
  if (name === 'Discord') return `${displayName}'s Discord`;
  return `Visit ${displayName}'s ${name}`;
}
