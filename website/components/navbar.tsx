'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

type NavItem = {
	name: string;
	href: string;
};

const navItems: NavItem[] = [
	{ name: 'Home', href: '/' },
	{ name: 'Notifications', href: '/notifications' },
	{ name: 'Agenda', href: '/agenda' },
	{ name: 'Schools', href: '/schools' },
	{ name: 'People', href: '/people' },
	{ name: 'Events', href: '/events' },
	{ name: "Audit Log", href: '/audit-log' },
];

export default function Navbar() {
	const pathname = usePathname();
	
	// Determine which nav item is currently active based on the route
	const isActive = (path: string): boolean => {
		return pathname === path;
	};

	return (
		<nav className="fixed top-0 left-0 right-0 z-50 bg-stone-900 text-white border-b-1 border-gray-300 shadow-lg">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-12">
					<div className="flex items-center space-x-4">
						{navItems.map((item) => (
							<Link
								key={item.name}
								href={item.href}
								className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out
									${isActive(item.href)
										? 'bg-indigo-600 text-white'
										: 'text-gray-300 hover:bg-gray-700 hover:text-white'
									}`}
							>
								{item.name}
							</Link>
						))}
					</div>
					<div className="flex items-center space-x-4">
						<button
							onClick={() => signOut({ callbackUrl: '/' })}
							className="px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out text-gray-300 hover:bg-gray-700 hover:text-white"
						>
							Sign Out
						</button>
					</div>
				</div>
			</div>
		</nav>
	);
}