import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const APP_DIR = path.join('.next', 'server', 'app')
const SITE_URL = 'https://inmogolfbonalba.com'

function readRequired(relativePath) {
  const file = path.join(APP_DIR, relativePath)
  assert.ok(existsSync(file), `Required build artifact is missing: ${file}`)
  return readFileSync(file, 'utf8')
}

function linkAttributes(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) =>
    Object.fromEntries(
      [...tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)].map(
        ([, name, value]) => [name.toLowerCase(), value]
      )
    )
  )
}

function linkHref(html, artifact, rel, hrefLang) {
  const link = linkAttributes(html).find((attributes) => {
    const rels = attributes.rel?.toLowerCase().split(/\s+/) ?? []
    return (
      rels.includes(rel) &&
      (hrefLang === undefined || attributes.hreflang === hrefLang)
    )
  })
  const description = hrefLang ? `${rel}/${hrefLang}` : rel
  assert.ok(link?.href, `${description} link is missing from ${artifact}`)
  return link.href
}

function canonicalFrom(html, artifact) {
  return linkHref(html, artifact, 'canonical')
}

function assertLanguageAlternates(html, artifact, expected) {
  for (const locale of ['en', 'es']) {
    assert.equal(
      linkHref(html, artifact, 'alternate', locale),
      expected[locale],
      `Unexpected ${locale} alternate in ${artifact}`
    )
  }
}

function titleFrom(html, artifact) {
  const match = html.match(/<title>([^<]*)<\/title>/)
  assert.ok(match, `Title is missing from ${artifact}`)
  return match[1]
}

for (const locale of ['en', 'es']) {
  const homeArtifact = `${locale}.html`
  const homeHtml = readRequired(homeArtifact)
  assert.equal(
    canonicalFrom(homeHtml, homeArtifact),
    `${SITE_URL}/${locale}`,
    `Unexpected ${locale} homepage canonical`
  )
  assertLanguageAlternates(homeHtml, homeArtifact, {
    en: `${SITE_URL}/en`,
    es: `${SITE_URL}/es`,
  })

  const legalArtifact = path.join(locale, 'aviso-legal.html')
  const legalHtml = readRequired(legalArtifact)
  const legalCanonical = canonicalFrom(legalHtml, legalArtifact)
  assert.equal(
    legalCanonical,
    `${SITE_URL}/${locale}/aviso-legal`,
    `Unexpected ${locale} legal canonical`
  )
  assert.equal(
    legalCanonical.includes(`/${locale}//`),
    false,
    `Double slash remains in ${locale} legal canonical`
  )
  assertLanguageAlternates(legalHtml, legalArtifact, {
    en: `${SITE_URL}/en/aviso-legal`,
    es: `${SITE_URL}/es/aviso-legal`,
  })

  const propertyDir = path.join(APP_DIR, locale, 'propiedad')
  assert.ok(
    existsSync(propertyDir),
    `Property build directory is missing: ${propertyDir}`
  )
  const propertyArtifactName = readdirSync(propertyDir)
    .filter((name) => name.endsWith('.html'))
    .sort()[0]
  assert.ok(
    propertyArtifactName,
    `No built property HTML exists for locale ${locale}`
  )

  const propertyArtifact = path.join(
    locale,
    'propiedad',
    propertyArtifactName
  )
  const propertyHtml = readRequired(propertyArtifact)
  const slug = propertyArtifactName.slice(0, -'.html'.length)
  assert.equal(
    canonicalFrom(propertyHtml, propertyArtifact),
    `${SITE_URL}/${locale}/propiedad/${slug}`,
    `Unexpected canonical in ${propertyArtifact}`
  )
  assertLanguageAlternates(propertyHtml, propertyArtifact, {
    en: `${SITE_URL}/en/propiedad/${slug}`,
    es: `${SITE_URL}/es/propiedad/${slug}`,
  })

  const propertyTitle = titleFrom(propertyHtml, propertyArtifact)
  assert.notEqual(
    propertyTitle.toLowerCase(),
    'inmogolf bonalba',
    `Generic title remains in ${propertyArtifact}`
  )
  const brandMatches = propertyTitle.match(/inmogolf bonalba/gi) ?? []
  assert.equal(
    brandMatches.length,
    1,
    `Expected brand exactly once in ${propertyArtifact}: ${propertyTitle}`
  )
}

const sitemap = readRequired('sitemap.xml.body')
assert.equal(sitemap.includes('<lastmod>'), false, 'Sitemap contains lastmod')
assert.equal(sitemap.includes('/en//'), false, 'Sitemap contains /en//')
assert.equal(sitemap.includes('/es//'), false, 'Sitemap contains /es//')

console.log('Built metadata OK')
