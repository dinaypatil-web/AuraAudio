import { GenreType, MoodType, Track } from '../types/music';

// Heuristic keyword mapping for instant offline & fast classification
const GENRE_KEYWORDS: Record<GenreType, string[]> = {
  'Lo-Fi': ['lofi', 'lo-fi', 'chillhop', 'relaxing beats', 'study beats', 'coffee', 'tape', 'vinyl', 'rainy night', 'aesthetic'],
  'Synthwave': ['synthwave', 'retrowave', 'outrun', 'cyberpunk', '80s', 'neon', 'darksynth', 'futuresynth', 'vaporwave'],
  'Electronic': ['electronic', 'techno', 'house', 'edm', 'club', 'dance', 'phonk', 'bass', 'dubstep', 'future bass', 'trance'],
  'Hip-Hop': ['hip hop', 'hip-hop', 'rap', 'trap', 'boom bap', 'freestyle', 'flow', 'r&b', 'rnb'],
  'Rock & Indie': ['rock', 'indie', 'guitar', 'alternative', 'acoustic rock', 'punk', 'folk', 'electric guitar'],
  'Classical & Piano': ['piano', 'classical', 'orchestral', 'violin', 'cello', 'symphony', 'sonata', 'solitude', 'nocturne', 'chopin', 'bach'],
  'Ambient': ['ambient', 'drone', 'binaural', 'meditation', 'soundscape', 'nature sounds', 'rain', 'theta waves', 'sleep music', 'white noise'],
  'Pop': ['pop', 'city pop', 'vocal', 'hit', 'radio', 'catchy', 'melodic pop'],
  'Jazz & Soul': ['jazz', 'soul', 'blues', 'saxophone', 'trumpet', 'groove', 'smooth jazz', 'bossa nova'],
  'Podcast & Talk': ['podcast', 'interview', 'talk', 'commentary', 'discussion', 'lecture', 'audiobook', 'story']
};

const MOOD_KEYWORDS: Record<MoodType, string[]> = {
  'Focus & Study': ['study', 'focus', 'work', 'code', 'programming', 'concentration', 'reading', 'deep work', 'library'],
  'Chill & Relax': ['chill', 'relax', 'lounge', 'lazy', 'warm', 'peaceful', 'calm', 'cozy', 'laid back', 'breeze', 'serene'],
  'Workout & Energy': ['workout', 'gym', 'energy', 'hype', 'cardio', 'pump', 'heavy', 'fast', 'running', 'drift', 'phonk', 'adrenaline'],
  'Sleep & Night': ['sleep', 'night', 'bedtime', 'dream', 'deep sleep', 'insomnia', 'ambient sleep', 'gentle', 'slow', 'darkness'],
  'Melancholy & Rainy': ['sad', 'rain', 'melancholy', 'tears', 'alone', 'lonely', 'autumn', 'nostalgia', 'cry', 'gray', 'fog'],
  'Euphoric & Uplifting': ['uplifting', 'happy', 'euphoric', 'joy', 'bright', 'summer', 'sunshine', 'celebrate', 'triumph', 'inspiring'],
  'Creative Flow': ['creative', 'flow', 'inspire', 'canvas', 'design', 'journey', 'odyssey', 'discovery', 'space', 'cosmic']
};

export function classifyTrackHeuristic(title: string, artist: string, tags: string[] = []): {
  genre: GenreType;
  mood: MoodType;
  energyLevel: number;
  vibeDescription: string;
} {
  const text = `${title} ${artist} ${tags.join(' ')}`.toLowerCase();

  // Find best genre
  let bestGenre: GenreType = 'Lo-Fi';
  let maxGenreScore = 0;

  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS) as [GenreType, string[]][]) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        score += kw.length > 5 ? 2 : 1;
      }
    }
    if (score > maxGenreScore) {
      maxGenreScore = score;
      bestGenre = genre;
    }
  }

  // Find best mood
  let bestMood: MoodType = 'Chill & Relax';
  let maxMoodScore = 0;

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS) as [MoodType, string[]][]) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        score += kw.length > 5 ? 2 : 1;
      }
    }
    if (score > maxMoodScore) {
      maxMoodScore = score;
      bestMood = mood;
    }
  }

  // Calculate energy level
  let energyLevel = 5;
  if (bestMood === 'Workout & Energy' || text.includes('phonk') || text.includes('club')) {
    energyLevel = 8 + (Math.random() > 0.5 ? 1 : 0);
  } else if (bestMood === 'Sleep & Night' || bestGenre === 'Ambient') {
    energyLevel = 2;
  } else if (bestMood === 'Chill & Relax' || bestGenre === 'Lo-Fi') {
    energyLevel = 4;
  } else if (bestMood === 'Focus & Study') {
    energyLevel = 5;
  } else if (bestMood === 'Euphoric & Uplifting') {
    energyLevel = 7;
  }

  const vibeDescription = `Organized as ${bestGenre} with a ${bestMood} aesthetic.`;

  return {
    genre: bestGenre,
    mood: bestMood,
    energyLevel,
    vibeDescription
  };
}

export async function requestAICategorization(tracks: Track[]): Promise<Map<string, { genre: GenreType; mood: MoodType; energyLevel: number; vibeDescription: string }>> {
  const resultsMap = new Map();

  try {
    const res = await fetch('/api/ai/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          resultsMap.set(item.id, {
            genre: item.genre as GenreType,
            mood: item.mood as MoodType,
            energyLevel: item.energyLevel || 5,
            vibeDescription: item.vibeDescription || ''
          });
        }
        return resultsMap;
      }
    }
  } catch (err) {
    console.warn('AI categorization request failed, using heuristic fallback', err);
  }

  // Fallback to heuristic
  for (const t of tracks) {
    resultsMap.set(t.id, classifyTrackHeuristic(t.title, t.artist, t.tags));
  }
  return resultsMap;
}
