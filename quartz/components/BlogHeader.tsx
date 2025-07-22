import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"

const BlogHeader: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const baseDir = pathToRoot(fileData.slug!)
  
  return (
    <header class={`blog-header ${displayClass || ""}`}>
      <div class="blog-header-content">
        <h1 class="blog-title">
          <a href={baseDir}>theduykhoa</a>
        </h1>
      </div>
    </header>
  )
}

BlogHeader.css = `
.blog-header {
  margin: 2rem 0 4rem 0;
  border-bottom: 1px solid var(--lightgray);
  padding-bottom: 2rem;
}

.blog-header-content {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  max-width: 100%;
}

.blog-title {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  font-family: var(--headerFont);
}

.blog-title a {
  color: var(--dark);
  text-decoration: none;
  background: none;
  padding: 0;
  border-radius: 0;
}

.blog-title a:hover {
  color: var(--secondary);
}

@media all and (max-width: 600px) {
  .blog-title {
    font-size: 2rem;
  }
}
`

export default (() => BlogHeader) satisfies QuartzComponentConstructor 