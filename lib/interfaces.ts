import { Image } from 'sanity'

import type { PropertyListingProjection } from './property-projection'

export interface Settings {
  title?: string
  description?: any[]
  ogImage?: {
    title?: string
  }
}

export interface FrontPage {
  featured: Featured[]
  latest: PropertyListingProjection[]
}

export interface Featured {
  title: string
  slug: string
  coverImage: Image
  tipo: string
  operacion: string
}

export interface Propiedad {
  _id: string
  title: string
  slug: string
  bathrooms: number
  bedrooms: number
  localizacion: string
  localizacionPadre?: Parent
  tipo: string
  price: number
  operacion: FilterString
  coverImage: Image
  images?: Image[]
  caracteristicas?: { title: string }[]
  description?: string
  size?: number
  year?: number
}

export interface Page {
  slug: string
}

interface Parent {
  parent: parentTitle
}

interface parentTitle {
  title: string
}

export interface FilterNum {
  min: number
  max: number
}

export interface FilterString {
  name: string
  value: string
}

interface Localizacion extends FilterString {
  name: string
  value: string
}

export interface ParentLocalizacion extends Localizacion {
  children: Localizacion[]
}

export interface FiltersDD {
  priceRentDD: number
  priceSaleDD: number
  bedroomsDD: number
  bathroomsDD: number
  operacionDD: FilterString[]
  localizacionDD: ParentLocalizacion[]
  tipoDD: FilterString[]
  total: number
}

export interface Dict {
  header: {
    email: string
    telefono: string
    lang_switcher: string
  }
  slogan: string
  destacados: string
  ultimos_anadidos: string
  contactar_button: string
  alquiler_tag: string
  footer: {
    quienes_somos: {
      quienes_somos_label: string
      quienes_somos_text: string
      aviso_legal_label: string
    }
    contacto: {
      contacto_label: string
      horario: string
    }
  }
  filters: {
    filtros_title: string
    search_button: string
    tipo_label: string
    tipo_allValue: string
    tipo_placeholder: string
    localizacion_label: string
    localizacion_allValue: string
    localizacion_placeholder: string
    precioMin_label: string
    precioMax_label: string
    banos_label: string
    habitaciones_label: string
  }
}
