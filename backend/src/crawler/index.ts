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
      url: 'https://grokipedia.com/page/Artificial_Intelligence',
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
    }
  ];
  
  console.log('[Crawler] Seeding sample topics...');
  
  for (const topic of sampleTopics) {
    insertTopic(topic.title, topic.url, topic.summary, topic.aliases);
  }
  
  console.log(`[Crawler] Seeded ${sampleTopics.length} sample topics`);
}
