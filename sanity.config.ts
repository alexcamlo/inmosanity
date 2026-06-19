'use client'

/**
 * This config is used to set up Sanity Studio that's mounted on the `/studio/[[...index]]` route
 */
// see https://www.sanity.io/docs/api-versioning for how versioning works
import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schema } from './lib/sanity.schema'
import { defaultDocumentNode, structure } from './lib/sanity.structure'

const apiVersion = '2023-01-01'
const dataset = 'production'
const projectId = 'vctgftz9'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  //edit schemas in './sanity/schema'
  schema: schema,
  plugins: [
    structureTool({ defaultDocumentNode, structure }),
    // Vision lets you query your content with GROQ in the studio
    // https://www.sanity.io/docs/the-vision-plugin
    visionTool({ defaultApiVersion: apiVersion }),
    // esESLocale(),
  ],
})
