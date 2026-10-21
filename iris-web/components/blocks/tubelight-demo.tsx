import { BookOpen, HeartHandshake, Home, Info, ListChecks } from 'lucide-react'
import { NavBar } from '@/components/ui/tubelight-navbar'

// Reference usage of the tubelight navbar (the live site uses it inside components/blocks/site-nav.tsx).
export function NavBarDemo() {
    const navItems = [
        { name: 'Home', section: 'home', icon: Home },
        { name: 'How it works', section: 'how-it-works', icon: ListChecks },
        { name: 'Research', url: '/research', icon: BookOpen },
        { name: 'Supporters', section: 'supporters', icon: HeartHandshake },
        { name: 'About', section: 'about', icon: Info },
    ]

    return <NavBar items={navItems} activeName="Home" />
}
