import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <h2 class={classNames(displayClass, "page-title")}>
      <a href={baseDir} class="logo-link">
        <img src="/static/logo.png" alt={title} class="logo-image" />
      </a>
    </h2>
  )
}

PageTitle.css = `
.page-title {
  font-size: 1.75rem;
  margin: 0;
  font-family: var(--titleFont);
}

.logo-link {
  display: block;
  text-decoration: none;
  background: none;
  padding: 0;
  border-radius: 0;
}

.logo-image {
  height: 4rem;
  width: auto;
  max-width: 300px;
  object-fit: contain;
  transition: opacity 0.2s ease;
}

.logo-image:hover {
  opacity: 0.8;
}

@media all and (max-width: 768px) {
  .logo-image {
    height: 3.0rem;
    max-width: 200px;
  }
}
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
