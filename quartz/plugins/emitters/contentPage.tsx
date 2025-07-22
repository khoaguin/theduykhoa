import path from "path"
import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { FullPageLayout } from "../../cfg"
import { pathToRoot } from "../../util/path"
import { defaultContentPageLayout, sharedPageComponents, blogLayout } from "../../../quartz.layout"
import { Content } from "../../components"
import { styleText } from "util"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"
import { Node } from "unist"
import { StaticResources } from "../../util/resources"
import { QuartzPluginData } from "../vfile"

async function processContent(
  ctx: BuildCtx,
  tree: Node,
  fileData: QuartzPluginData,
  allFiles: QuartzPluginData[],
  opts: FullPageLayout,
  resources: StaticResources,
) {
  const slug = fileData.slug!
  const cfg = ctx.cfg.configuration
  const externalResources = pageResources(pathToRoot(slug), resources)
  const componentData: QuartzComponentProps = {
    ctx,
    fileData,
    externalResources,
    cfg,
    children: [],
    tree,
    allFiles,
  }

  const content = renderPage(cfg, slug, componentData, opts, externalResources)
  return write({
    ctx,
    content,
    slug,
    ext: ".html",
  })
}

export const ContentPage: QuartzEmitterPlugin<Partial<FullPageLayout>> = (userOpts) => {
  const defaultOpts: FullPageLayout = {
    ...sharedPageComponents,
    ...defaultContentPageLayout,
    pageBody: Content(),
    ...userOpts,
  }

  const blogOpts: FullPageLayout = {
    ...sharedPageComponents,
    ...blogLayout,
    pageBody: Content(),
    ...userOpts,
  }

  const { head: Head, header, beforeBody, pageBody, afterBody, left, right, footer: Footer } = defaultOpts
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  return {
    name: "ContentPage",
    getQuartzComponents() {
      return [
        Head,
        Header,
        Body,
        ...header,
        ...beforeBody,
        pageBody,
        ...afterBody,
        ...left,
        ...right,
        Footer,
        // Also include components from blog layout
        ...blogLayout.beforeBody,
        ...blogLayout.left,
        ...blogLayout.right,
      ]
    },
    async *emit(ctx, content, resources) {
      const allFiles = content.map((c) => c[1].data)
      let containsIndex = false

      for (const [tree, file] of content) {
        const slug = file.data.slug!
        if (slug === "index") {
          containsIndex = true
        }

        // only process home page, non-tag pages, and non-index pages
        if (slug.endsWith("/index") || slug.startsWith("tags/")) continue

        // Use blog layout for the index page, default layout for others
        const opts = slug === "index" ? blogOpts : defaultOpts
        yield processContent(ctx, tree, file.data, allFiles, opts, resources)
      }

      if (!containsIndex) {
        console.log(
          styleText(
            "yellow",
            `\nWarning: you seem to be missing an \`index.md\` home page file at the root of your \`${ctx.argv.directory}\` folder (\`${path.join(ctx.argv.directory, "index.md")} does not exist\`). This may cause errors when deploying.`,
          ),
        )
      }
    },
  }
}
