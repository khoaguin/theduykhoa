import { FullSlug, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Date, getDate } from "./Date"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { GlobalConfiguration } from "../cfg"
import { byDateAndAlphabetical, SortFn } from "./PageList"

type Props = {
  limit?: number
  sort?: SortFn
} & QuartzComponentProps

function estimateReadingTime(content?: string): number {
  if (!content) return 5
  // Average reading speed is ~200 words per minute
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).length
  const minutes = Math.ceil(wordCount / wordsPerMinute)
  return Math.max(1, minutes)
}

function getTagColor(tag: string): string {
  // Define colors for different tag categories
  const tagColors: Record<string, string> = {
    'ai': 'var(--tag-ai)',
    'machine-learning': 'var(--tag-ai)', 
    'ml': 'var(--tag-ai)',
    'coding': 'var(--tag-coding)',
    'programming': 'var(--tag-coding)',
    'development': 'var(--tag-coding)',
    'web': 'var(--tag-web)',
    'frontend': 'var(--tag-web)',
    'backend': 'var(--tag-web)',
    'javascript': 'var(--tag-web)',
    'typescript': 'var(--tag-web)',
    'react': 'var(--tag-web)',
    'data-science': 'var(--tag-data)',
    'analytics': 'var(--tag-data)',
    'ppml': 'var(--tag-security)',
    'privacy': 'var(--tag-security)',
    'security': 'var(--tag-security)',
    'medical-ai': 'var(--tag-medical)',
    'health': 'var(--tag-medical)',
    'productivity': 'var(--tag-productivity)',
    'tools': 'var(--tag-productivity)',
    'workflow': 'var(--tag-productivity)',
    'life': 'var(--tag-life)',
    'personal': 'var(--tag-life)',
    'thoughts': 'var(--tag-life)',
  }
  
  // Return specific color if found, otherwise return a default
  return tagColors[tag.toLowerCase()] || 'var(--tag-default)'
}

export const BlogPageList: QuartzComponent = ({ cfg, fileData, allFiles, limit, sort }: Props) => {
  const sorter = sort ?? byDateAndAlphabetical(cfg)
  // Filter out the index and about pages from blog post listing
  let list = allFiles.filter(file => file.slug !== "index" && file.slug !== "about").sort(sorter)
  if (limit) {
    list = list.slice(0, limit)
  }

  return (
    <div class="blog-posts">
      {list.map((page) => {
        const title = page.frontmatter?.title
        const summary = page.frontmatter?.summary || page.frontmatter?.description
        const tags = page.frontmatter?.tags ?? []
        const readingTime = estimateReadingTime(page.text)

        return (
          <article class="blog-post-card">
            {page.frontmatter?.thumbnail && (
              <div class="post-thumbnail">
                <img src={page.frontmatter.thumbnail} alt={title} />
              </div>
            )}
            
            <div class="post-content">
              <div class="post-date">
                {page.dates && <Date date={getDate(cfg, page)!} locale={cfg.locale} />}
              </div>
              
              {tags.length > 0 && (
                <div class="post-tags">
                  {tags.slice(0, 2).map((tag) => (
                    <span 
                      class={`post-tag post-tag-${tag.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    >
                      {tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')}
                    </span>
                  ))}
                </div>
              )}
              
              <h3 class="post-title">
                <a href={resolveRelative(fileData.slug!, page.slug!)} class="internal">
                  {title}
                </a>
              </h3>
              
              <div class="post-meta">
                <span class="reading-time">⏱ {readingTime} min read</span>
              </div>
              
              {summary && (
                <p class="post-summary">{summary}</p>
              )}
              
              <a href={resolveRelative(fileData.slug!, page.slug!)} class="read-more">
                Read more →
              </a>
            </div>
          </article>
        )
      })}
    </div>
  )
}

BlogPageList.css = `
.blog-posts {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  margin-top: 2rem;
}

.blog-post-card {
  display: flex;
  gap: 2rem;
  padding: 1.5rem;
  border: 1px solid var(--lightgray);
  border-radius: 12px;
  background: var(--light);
  transition: all 0.2s ease;
}

.blog-post-card:hover {
  border-color: var(--secondary);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.post-thumbnail {
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
}

.post-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-content {
  flex: 1;
  min-width: 0;
}

.post-date {
  font-size: 0.85rem;
  color: var(--gray);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  margin-bottom: 0.8rem;
}

.post-tags {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.post-tag {
  padding: 0.3rem 0.8rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.post-tag-ai, .post-tag-machine-learning, .post-tag-ml {
  background-color: var(--tag-ai);
}

.post-tag-coding, .post-tag-programming, .post-tag-development {
  background-color: var(--tag-coding);
}

.post-tag-web, .post-tag-frontend, .post-tag-backend, .post-tag-javascript, .post-tag-typescript, .post-tag-react {
  background-color: var(--tag-web);
}

.post-tag-data-science, .post-tag-analytics {
  background-color: var(--tag-data);
}

.post-tag-ppml, .post-tag-privacy, .post-tag-security {
  background-color: var(--tag-security);
}

.post-tag-medical-ai, .post-tag-health {
  background-color: var(--tag-medical);
}

.post-tag-productivity, .post-tag-tools, .post-tag-workflow {
  background-color: var(--tag-productivity);
}

.post-tag-life, .post-tag-personal, .post-tag-thoughts {
  background-color: var(--tag-life);
}

.post-title {
  margin: 0 0 1rem 0;
  font-size: 1.8rem;
  line-height: 1.3;
  font-weight: 700;
}

.post-title a {
  color: var(--dark);
  text-decoration: none;
  background: none;
  padding: 0;
  border-radius: 0;
}

.post-title a:hover {
  color: var(--secondary);
}

.post-meta {
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--gray);
}

.reading-time {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.post-summary {
  color: var(--darkgray);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  font-size: 1rem;
}

.read-more {
  color: var(--secondary);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  transition: color 0.2s ease;
  background: none;
  padding: 0;
  border-radius: 0;
}

.read-more:hover {
  color: var(--tertiary);
}

@media all and (max-width: 768px) {
  .blog-post-card {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .post-thumbnail {
    width: 100%;
    height: 160px;
  }
  
  .post-title {
    font-size: 1.4rem;
  }
  
  .blog-posts {
    gap: 2rem;
  }
}
`

export default (() => BlogPageList) satisfies QuartzComponentConstructor 