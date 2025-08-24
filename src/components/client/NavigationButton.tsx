import { Button } from "@/components/ui/button"
import { IconPlus, IconWaveSine } from "@tabler/icons-react"

type IconProps = typeof IconPlus

export type NavigationButtonProps = {
  title: string
  onPress?: () => void
}

export function NavigationButton({ title, onPress }: NavigationButtonProps) {
  return (
    <Button
      className="flex backdrop-blur-lg flex-row border-1 border-white/10 hover:border-orange-400 items-center px-2 hover:bg-white/10 justify-between *:text-white/75 hover:*:text-orange-400"
      onClick={onPress}
    >
      <div className="border-r-1 border-r-white/10 pl-1 pr-1.5">
        <IconPlus size={16} />
      </div>
      <p className="px-0.5 font-light">{title}</p>
    </Button>
  )
}
