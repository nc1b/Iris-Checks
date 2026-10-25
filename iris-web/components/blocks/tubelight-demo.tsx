import { BookOpen, Home, Info, ListChecks } from 'lucide-react'
import { NavBar } from '@/components/ui/tubelight-navbar'

export function NavBarDemo() {
    const navItems = [
        { name: 'Home', section: 'home', icon: Home },
        { name: 'How it works', section: 'how-it-works', icon: ListChecks },
        { name: 'Research', url: '/research', icon: BookOpen },
        { name: 'About', section: 'about', icon: Info },
    ]

    return <NavBar items={navItems} activeName="Home" />
}
