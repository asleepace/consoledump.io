import { IconWaveSine } from '@tabler/icons-react'

export function NavigationLogo() {
  return (
    <div
      className="flex flex-row items-center px-4 gap-x-2 justify-between"
      onClick={() => (window.location.href = '/')}
    >
      <IconWaveSine size={24} color="white" />
      <p className='text-white text-md font-black tracking-tight uppercase'>Console<span className='text-orange-500'>Dump</span></p>
    </div>
  )
}
