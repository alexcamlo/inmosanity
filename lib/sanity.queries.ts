import { groq } from 'next-sanity'

export const PROPIEDAD_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  bathrooms,
  bedrooms,
  "operacion": {
      "name": select(operacion->title[$lang] != "" => operacion->title[$lang], operacion->title['es']),
      "value": operacion._ref
  },
  "localizacion": localizacion->title,
  "localizacionPadre": localizacion->{parent->{title}},
  "tipo": select(tipo->title[$lang] != "" => tipo->title[$lang], tipo->title['es']),
  price,
  size,
  year,
`

export const frontPageQuery = groq`
{
  "featured": *[_type == "propiedad" && featured] | order(_createdAt desc) [0...6] {
    title,
    "slug": slug.current,
    "coverImage": images[0],
    "tipo": select(tipo->title[$lang] != "" => tipo->title[$lang], tipo->title['es']),
    "operacion": select(operacion->title[$lang] != "" => operacion->title[$lang], operacion->title['es']),
  },
  "latest": *[_type == "propiedad"] | order(_createdAt desc) [0...12] {
    ${PROPIEDAD_FIELDS}
    "coverImage": images[0],
  },
}`

export const propiedadSlugsQuery = groq`
  *[_type == "propiedad" && !(_id in path("drafts.**")) && defined(slug.current)]|order(_createdAt desc)[].slug.current
`

export const propiedadBySlugQuery = groq`
  *[_type == "propiedad" && slug.current == $slug][0] {
    ${PROPIEDAD_FIELDS}
    "caracteristicas": caracteristicas[]{
    "title": select(
      @->title[$lang] != "" => @->title[$lang],
      @->title['es']),
    },
    "images": images[],
    "description": coalesce(description[$lang], description['es']),
  }
`

export const pageSlugsQuery = groq`
  *[_type == "paginas" && defined(slug.current)][].slug.current
`

export const pageBySlugQuery = groq`
  *[_type == "paginas" && slug.current == $slug][0] {
    "slug": slug.current,
    "content": content[$lang],
  }
`

/**
 * Combined filters dropdown query.
 * Returns all dropdown values and stats in a single GROQ request
 * to avoid 8 separate Data Cache entries.
 */
export const filtersDropdownQuery = groq`
{
  "operacionDD": array::unique(*[_type == "operacion" ]{
    "name": title[$lang],
    "value": _id
  }),
  "tipoDD": array::unique(*[_type =="tipo"  && count(*[ _type == 'propiedad' && references(^._id)]) > 0]{
    "name": title[$lang],
    "value":_id
  }),
  "localizacionDD": *[_type == 'localizacion' && !(defined(parent))]{
    title,
    _id,
    "count": count(*[_type == 'propiedad' && !(_id in path('drafts.**')) && references(^._id)]),
    "children": *[ _type == 'localizacion' && references(^._id) && count(*[_type == 'propiedad' && !(_id in path('drafts.**')) && references(^._id)]) > 0]{
      title,
      _id,
      "count": count(*[_type == 'propiedad' && !(_id in path('drafts.**')) && references(^._id)])
    } | order(title asc),

  }[ count > 0 || count(children) > 0]{
    "name": title,
    "value": _id,
    count(children) > 0 => {
        children[]{
          "name": title,
          "value": _id,
        }
          },
  } | order(title asc),
  "priceRentDD": math::max(*[_type == 'propiedad' && operacion._ref == 'operacion-en-alquiler'].price),
  "priceSaleDD": math::max(*[_type == 'propiedad' && operacion._ref != 'operacion-en-alquiler'].price),
  "bathroomsDD": math::max(*[_type == 'propiedad'].bathrooms),
  "bedroomsDD": math::max(*[_type == 'propiedad'].bedrooms),
  "total": count(*[_type == 'propiedad'])
}`
