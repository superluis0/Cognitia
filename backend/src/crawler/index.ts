import { insertTopic, getTopicCount } from '../index/database.js';

export async function seedSampleTopics(): Promise<void> {
  const count = getTopicCount();
  
  if (count > 0) {
    console.log(`[Crawler] Database already has ${count} topics, skipping seed`);
    return;
  }
  
  const sampleTopics = [
    {
      title: 'The Beatles',
      url: 'https://grokipedia.com/page/The_Beatles',
      summary: 'The Beatles were an English rock band formed in Liverpool in 1960.',
      aliases: ['Beatles', 'Fab Four']
    },
    {
      title: 'Artificial Intelligence',
      url: 'https://grokipedia.com/page/Artificial_intelligence',
      summary: 'Artificial intelligence is intelligence demonstrated by machines.',
      aliases: ['AI', 'Machine Intelligence']
    },
    {
      title: 'Elon Musk',
      url: 'https://grokipedia.com/page/Elon_Musk',
      summary: 'Elon Musk is a business magnate and investor known for SpaceX and Tesla.',
      aliases: ['Musk']
    },
    {
      title: 'Bitcoin',
      url: 'https://grokipedia.com/page/Bitcoin',
      summary: 'Bitcoin is a decentralized digital currency created in 2009.',
      aliases: ['BTC']
    },
    {
      title: 'SpaceX',
      url: 'https://grokipedia.com/page/SpaceX',
      summary: 'SpaceX is an American spacecraft manufacturer founded by Elon Musk.',
      aliases: ['Space Exploration Technologies Corp']
    },
    {
      title: 'Tesla',
      url: 'https://grokipedia.com/page/Tesla',
      summary: 'Tesla, Inc. is an American electric vehicle and clean energy company.',
      aliases: ['Tesla Motors', 'Tesla Inc']
    },
    {
      title: 'Machine Learning',
      url: 'https://grokipedia.com/page/Machine_Learning',
      summary: 'Machine learning is a type of artificial intelligence that allows computers to learn.',
      aliases: ['ML']
    },
    {
      title: 'Neural Network',
      url: 'https://grokipedia.com/page/Neural_Network',
      summary: 'A neural network is a computing system inspired by biological neural networks.',
      aliases: ['Neural Networks', 'ANN']
    },
    {
      title: 'Twitter',
      url: 'https://grokipedia.com/page/Twitter',
      summary: 'Twitter is an American social media platform for microblogging.',
      aliases: ['X', 'X Corp']
    },
    {
      title: 'OpenAI',
      url: 'https://grokipedia.com/page/OpenAI',
      summary: 'OpenAI is an American AI research organization.',
      aliases: []
    },
    {
      title: 'ChatGPT',
      url: 'https://grokipedia.com/page/ChatGPT',
      summary: 'ChatGPT is an AI chatbot developed by OpenAI.',
      aliases: ['GPT', 'GPT-4']
    },
    {
      title: 'Grok',
      url: 'https://grokipedia.com/page/Grok',
      summary: 'Grok is an AI chatbot developed by xAI, founded by Elon Musk.',
      aliases: []
    },
    {
      title: 'Cryptocurrency',
      url: 'https://grokipedia.com/page/Cryptocurrency',
      summary: 'Cryptocurrency is a digital currency secured by cryptography.',
      aliases: ['Crypto', 'Digital Currency']
    },
    {
      title: 'Blockchain',
      url: 'https://grokipedia.com/page/Blockchain',
      summary: 'A blockchain is a distributed ledger technology.',
      aliases: []
    },
    {
      title: 'Ethereum',
      url: 'https://grokipedia.com/page/Ethereum',
      summary: 'Ethereum is a decentralized blockchain platform.',
      aliases: ['ETH']
    },
    // Additional popular topics that should be available immediately
    {
      title: 'NFT',
      url: 'https://grokipedia.com/page/NFT',
      summary: 'NFTs are unique digital assets verified using blockchain technology.',
      aliases: ['Non-Fungible Token', 'Non-Fungible Tokens']
    },
    {
      title: 'NFL',
      url: 'https://grokipedia.com/page/NFL',
      summary: 'The National Football League is a professional American football league.',
      aliases: ['National Football League']
    },
    {
      title: 'NBA',
      url: 'https://grokipedia.com/page/NBA',
      summary: 'The National Basketball Association is a professional basketball league.',
      aliases: ['National Basketball Association']
    },
    {
      title: 'UFC',
      url: 'https://grokipedia.com/page/UFC',
      summary: 'The Ultimate Fighting Championship is a mixed martial arts promotion.',
      aliases: ['Ultimate Fighting Championship', 'MMA']
    },
    {
      title: 'Classical physics',
      url: 'https://grokipedia.com/page/Classical_physics',
      summary: 'Classical physics describes physics before modern quantum and relativity theories.',
      aliases: ['Classical Physics', 'Newtonian Physics']
    },
    {
      title: 'Threads',
      url: 'https://grokipedia.com/page/Threads_(social_network)',
      summary: 'Threads is a social media platform developed by Meta.',
      aliases: ['Threads App']
    },
    {
      title: 'Discord',
      url: 'https://grokipedia.com/page/Discord',
      summary: 'Discord is a communication platform for communities and gaming.',
      aliases: []
    },
    {
      title: 'Twitch',
      url: 'https://grokipedia.com/page/Twitch',
      summary: 'Twitch is a live streaming platform focused on gaming and entertainment.',
      aliases: ['Twitch.tv']
    },
    {
      title: 'Wall Street',
      url: 'https://grokipedia.com/page/Wall_Street',
      summary: 'Wall Street is the financial district of New York City.',
      aliases: []
    },
    {
      title: 'Pharmacology',
      url: 'https://grokipedia.com/page/Pharmacology',
      summary: 'Pharmacology is the science of drugs and their effects on living systems.',
      aliases: []
    },
    {
      title: 'Hippocratic Oath',
      url: 'https://grokipedia.com/page/Hippocratic_Oath',
      summary: 'The Hippocratic Oath is an ethical code for physicians.',
      aliases: []
    },
    {
      title: 'Egyptian',
      url: 'https://grokipedia.com/page/Egyptian',
      summary: 'Egyptian refers to the people, culture, and civilization of Egypt.',
      aliases: ['Ancient Egyptian', 'Egypt']
    },
    {
      title: 'Middle English',
      url: 'https://grokipedia.com/page/Middle_English',
      summary: 'Middle English is the form of English spoken from 1150 to 1500.',
      aliases: []
    },
    {
      title: 'World Cup',
      url: 'https://grokipedia.com/page/World_Cup',
      summary: 'The FIFA World Cup is the premier international football tournament.',
      aliases: ['FIFA World Cup', 'Football World Cup']
    },
    {
      title: 'Olympics',
      url: 'https://grokipedia.com/page/Olympics',
      summary: 'The Olympic Games are international sporting events held every four years.',
      aliases: ['Olympic Games', 'Summer Olympics', 'Winter Olympics']
    },
    {
      title: 'Academy Awards',
      url: 'https://grokipedia.com/page/Academy_Awards',
      summary: 'The Academy Awards are annual awards for artistic and technical merit in film.',
      aliases: ['Oscars', 'The Oscars']
    }
  ];

  console.log('[Crawler] Seeding sample topics...');
  
  for (const topic of sampleTopics) {
    insertTopic(topic.title, topic.url, topic.summary, topic.aliases);
  }
  
  console.log(`[Crawler] Seeded ${sampleTopics.length} sample topics`);
}
