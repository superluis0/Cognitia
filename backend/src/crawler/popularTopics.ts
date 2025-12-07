/**
 * Popular topics to seed the database with.
 * These cover trending topics likely to appear on X.com
 */
export const POPULAR_TOPICS = [
  // Tech & AI
  'Artificial_Intelligence',
  'Machine_Learning',
  'ChatGPT',
  'OpenAI',
  'Grok',
  'Claude_(AI)',
  'Large_Language_Model',
  'Neural_Network',
  'Deep_Learning',
  'Generative_AI',
  'AGI',
  'Sam_Altman',
  
  // Tech Companies & People
  'Elon_Musk',
  'Tesla',
  'SpaceX',
  'Twitter',
  'Meta_Platforms',
  'Mark_Zuckerberg',
  'Apple_Inc.',
  'Tim_Cook',
  'Google',
  'Sundar_Pichai',
  'Microsoft',
  'Satya_Nadella',
  'Amazon_(company)',
  'Jeff_Bezos',
  'Nvidia',
  'Jensen_Huang',
  
  // Crypto
  'Bitcoin',
  'Ethereum',
  'Cryptocurrency',
  'Blockchain',
  'Dogecoin',
  'NFT',
  'Web3',
  
  // Politics - US
  'Donald_Trump',
  'Joe_Biden',
  'Kamala_Harris',
  'Barack_Obama',
  'Ron_DeSantis',
  'Republican_Party_(United_States)',
  'Democratic_Party_(United_States)',
  'United_States_Congress',
  'Supreme_Court_of_the_United_States',
  
  // World Leaders
  'Vladimir_Putin',
  'Xi_Jinping',
  'Volodymyr_Zelenskyy',
  'Benjamin_Netanyahu',
  'Narendra_Modi',
  
  // Current Events Topics
  'Ukraine',
  'Russia',
  'Israel',
  'Gaza',
  'Climate_Change',
  'NATO',
  'European_Union',
  
  // Entertainment
  'Taylor_Swift',
  'Beyoncé',
  'Drake_(musician)',
  'Kanye_West',
  'Travis_Scott',
  'Rihanna',
  'Kim_Kardashian',
  'Kendrick_Lamar',
  
  // Sports
  'NFL',
  'NBA',
  'Patrick_Mahomes',
  'LeBron_James',
  'Lionel_Messi',
  'Cristiano_Ronaldo',
  'UFC',
  
  // Science & Space
  'NASA',
  'Mars',
  'James_Webb_Space_Telescope',
  'Black_Hole',
  'Quantum_Computing',
  
  // Culture & Media
  'Netflix',
  'YouTube',
  'TikTok',
  'Instagram',
  'Threads_(social_network)',
  'Reddit',
  'Discord',
  'Twitch',
  
  // Finance
  'Federal_Reserve',
  'Stock_Market',
  'Inflation',
  'S%26P_500',
  'Wall_Street',
  
  // Health
  'COVID-19',
  'World_Health_Organization',
  'Vaccine',
  
  // Other trending
  'The_Beatles',
  'Super_Bowl',
  'World_Cup',
  'Olympics',
  'Grammy_Awards',
  'Academy_Awards'
];

export function getTopicUrl(topic: string): string {
  return `https://grokipedia.com/page/${topic}`;
}

export function getAllTopicUrls(): string[] {
  return POPULAR_TOPICS.map(getTopicUrl);
}
