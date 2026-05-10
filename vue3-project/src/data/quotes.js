export const quotes = [
  {
    text: '每一天都是新的开始，不要辜负每一个清晨。',
    author: '佚名'
  },
  {
    text: '成功不是将来才有的，而是从决定去做的那一刻起，持续累积而成。',
    author: '俞敏洪'
  },
  {
    text: '生活不会因为你是女孩就对你温柔以待，但你可以因为努力而被世界温柔以待。',
    author: '佚名'
  },
  {
    text: '人生最大的挑战是发现自己是谁，而第二大的挑战是对所发现的感到满意。',
    author: '罗杰·塞尔夫'
  },
  {
    text: '只有那些敢于相信自己内心深处有比现实更强大力量的人，才能改变世界。',
    author: '乔布斯'
  },
  {
    text: '每一个不曾起舞的日子，都是对生命的辜负。',
    author: '尼采'
  },
  {
    text: '不要等待机会，而要创造机会。',
    author: '林肯'
  },
  {
    text: '你的努力，终将成就独一无二的自己。',
    author: '佚名'
  },
  {
    text: '生活的美好在于，每一个今天都比昨天更接近梦想。',
    author: '佚名'
  },
  {
    text: '人生没有白走的路，每一步都算数。',
    author: '李宗盛'
  }
]

export function getRandomQuote() {
  const index = Math.floor(Math.random() * quotes.length)
  return quotes[index]
}