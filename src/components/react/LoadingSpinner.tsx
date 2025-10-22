import { LoaderCircle } from 'lucide-react'

export function LoadingSpinner() {
  return (
    <div className="flex flex-col w-full grow items-center justify-center">
      <LoaderCircle className="text-orange-400 animate-spin" size={36} />
    </div>
  )
}
