import FilterBar from '@/components/FilterBar'
import PropiedadCard from '@/components/ui/PropiedadCard'
import Filters from '@/components/ui/filters'
import { getDictionary } from '@/get-dictionary'
import { Locale } from '@/i18n-config'
import {
  getFiltersDropdownValues,
  getSearchProperties,
} from '@/lib/sanity.client'
import { getPropertyListingMetadata } from '@/lib/site-metadata'
import clsx from 'clsx'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{
    lang: Locale
  }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  return getPropertyListingMetadata(params.lang)
}

export default async function PropiedadesPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const dict = await getDictionary(params.lang)
  const filtersDD = await getFiltersDropdownValues(params.lang)
  const propiedades = await getSearchProperties(
    searchParams,
    params.lang as Locale
  )

  return (
    <>
      <FilterBar dict={dict} filtersDD={filtersDD} />
      <div className=' mx-auto max-w-5xl flex-col gap-6 px-4 py-20 lg:flex lg:flex-row lg:px-6 lg:py-12'>
        <div className='relative isolate hidden w-[19.5rem] flex-col lg:flex'>
          <h2 className='py-2 text-sm font-semibold uppercase  tracking-wide text-zinc-800 lg:px-0'>
            {dict.filters.filtros_title}
          </h2>
          <Filters dict={dict} filtersDD={filtersDD} />
        </div>

        <div className='grow'>
          <h2 className=' py-2 text-sm font-semibold uppercase  tracking-wide text-zinc-800 lg:px-0'>
            {propiedades.length == 1
              ? `${propiedades.length} ${dict.resultado}`
              : `${propiedades.length} ${dict.resultados}`}
          </h2>
          <div
            className={clsx(
              'grid  grid-cols-cards gap-4',
              propiedades.length > 1 ? 'justify-center' : ''
            )}
          >
            {propiedades.map((propiedad) => (
              <PropiedadCard
                key={propiedad.slug}
                params={params}
                dict={dict}
                propiedad={propiedad}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
