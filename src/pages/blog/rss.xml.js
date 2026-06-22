import { getCollection } from 'astro:content';
import { getRelativeLocaleUrl } from 'astro:i18n';
import rss from '@astrojs/rss';

export async function GET(context) {
  const blog = (
    await getCollection('blog', ({ data }) => {
      return data.lang === 'en' && data.draft !== true;
    })
  ).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  return rss({
    title: 'Buzz’s Blog',
    description: 'A humble Astronaut’s guide to the stars',
    site: context.site,
    items: blog.map(post => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      // Compute RSS link from post `id`
      // This example assumes all posts are rendered as `/blog/[id]` routes
      link: `/${getRelativeLocaleUrl('ko', `/blog/${post.id}`)}/`,
    })),
  });
}
