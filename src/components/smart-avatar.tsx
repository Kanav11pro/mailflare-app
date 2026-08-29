"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { getEmailAddress } from "@/lib/email/address";

const CONSUMER_DOMAINS = new Set([
	"gmail.com",
	"googlemail.com",
	"yahoo.com",
	"hotmail.com",
	"outlook.com",
	"live.com",
	"icloud.com",
	"aol.com",
	"proton.me",
	"protonmail.com",
]);

const AVATAR_GRADIENTS = [
	"from-blue-600 to-indigo-600",
	"from-emerald-500 to-teal-700",
	"from-purple-500 to-pink-600",
	"from-amber-500 to-orange-600",
	"from-rose-500 to-red-700",
	"from-cyan-500 to-blue-700",
	"from-violet-600 to-purple-800",
];

function getGradientForString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
	return AVATAR_GRADIENTS[index];
}

interface SmartAvatarProps {
	name?: string | null;
	address?: string | null;
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function SmartAvatar({
	name,
	address,
	size = "md",
	className,
}: SmartAvatarProps) {
	const [faviconError, setFaviconError] = useState(false);

	const cleanEmail = address ? getEmailAddress(address) : "";
	const domain = cleanEmail ? cleanEmail.split("@")[1]?.toLowerCase() : "";
	const isCustomDomain = domain && !CONSUMER_DOMAINS.has(domain);

	const rawName = (name || cleanEmail || "?").replace(/["'<>[\]()]/g, "").trim();
	const initials = rawName
		.split(/\s+/)
		.map((part) => part[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase() || "?";

	const sizeClasses = {
		sm: "h-6 w-6 text-[10px]",
		md: "h-8 w-8 text-xs",
		lg: "h-10 w-10 text-sm",
	}[size];

	const imgSizeClasses = {
		sm: "h-4 w-4",
		md: "h-5 w-5",
		lg: "h-6 w-6",
	}[size];

	const gradient = getGradientForString(cleanEmail || name || "mailflare");

	if (isCustomDomain && !faviconError) {
		const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
		return (
			<div
				className={cn(
					"flex shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white p-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-800",
					sizeClasses,
					className,
				)}
			>
				<img
					src={faviconUrl}
					alt={domain}
					className={cn("rounded-sm object-contain", imgSizeClasses)}
					onError={() => setFaviconError(true)}
					loading="lazy"
				/>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-semibold text-white shadow-sm",
				gradient,
				sizeClasses,
				className,
			)}
		>
			<span>{initials}</span>
		</div>
	);
}
