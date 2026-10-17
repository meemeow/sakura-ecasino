import type { GameCategory } from '@/types'
import allIcon from '@/assets/icons/tabs/all.svg'
import slotsIcon from '@/assets/icons/tabs/slots.svg'
import favoritesIcon from '@/assets/icons/tabs/favorites.svg'
import tableIcon from '@/assets/icons/tabs/table.svg'
import gameshowIcon from '@/assets/icons/tabs/gameshow.svg'
import fishingIcon from '@/assets/icons/tabs/fishing.svg'

// Lobby tabs, shared by GameTabs, the sidebar and the router (one route per tab).
export interface GameTabDef {
  value: string
  label: string
  /** URL of the 3D icon image (src/assets/icons/tabs) */
  icon: string
  to: string
  /** Catalog category this tab lists; 'all' and 'favorites' have none */
  category?: GameCategory
  /** Tab title in the browser ("Sakura | <title>") */
  title?: string
}

export const gameTabs = [
  { value: 'all', label: 'All', icon: allIcon, to: '/' },
  {
    value: 'slots',
    label: 'Slots',
    icon: slotsIcon,
    to: '/slots',
    category: 'slots',
    title: 'Online Slots',
  },
  { value: 'favorites', label: 'Favorites', icon: favoritesIcon, to: '/favorites' },
  {
    value: 'table',
    label: 'Table',
    icon: tableIcon,
    to: '/table',
    category: 'table',
    title: 'Table Games',
  },
  {
    value: 'gameshow',
    label: 'Game Shows',
    icon: gameshowIcon,
    to: '/game-shows',
    category: 'gameshow',
    title: 'Game Shows',
  },
  {
    value: 'fishing',
    label: 'Fishing',
    icon: fishingIcon,
    to: '/fishing',
    category: 'fishing',
    title: 'Fishing Games',
  },
] as const satisfies readonly GameTabDef[]

export type GameTab = (typeof gameTabs)[number]['value']
