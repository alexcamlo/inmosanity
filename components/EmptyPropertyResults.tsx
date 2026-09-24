import Link from 'next/link'

type Props = {
  heading: string
  message: string
  actionLabel: string
  resetHref: string
}

export default function EmptyPropertyResults({
  heading,
  message,
  actionLabel,
  resetHref,
}: Props) {
  return (
    <section className='flex flex-col items-center rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-12 text-center'>
      <h2 className='text-xl font-semibold text-zinc-800'>{heading}</h2>
      <p className='mt-2 max-w-md text-zinc-600'>{message}</p>
      <Link
        href={resetHref}
        className='mt-6 rounded-lg bg-green-700 px-6 py-3 font-medium text-white transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2'
      >
        {actionLabel}
      </Link>
    </section>
  )
}
