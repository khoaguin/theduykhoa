import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"

const BlogHeader: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  return (
    <header class={`blog-header ${displayClass || ""}`}>
    </header>
  )
}

BlogHeader.css = `
.blog-header {
  margin: 0;
  padding: 0;
}
`

export default (() => BlogHeader) satisfies QuartzComponentConstructor 