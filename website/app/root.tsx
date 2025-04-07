'use client';

import Navbar from "@/components/navbar";
import { SessionProvider } from "next-auth/react";

export default function Root({
		children,
	}: Readonly<{
		children: React.ReactNode;
	}>) {
	return (
		<SessionProvider>
			<Navbar />
			<main className="pt-16 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
					{children}
			</main>
		</SessionProvider>
	);
}