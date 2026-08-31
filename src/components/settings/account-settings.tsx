"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangePasswordForm } from "./change-password-form";
import { ProfileForm } from "./profile-form";
import type { AccountSettingsResponse } from "./types";
import { loadAccountSettings } from "./utils";

import { MailboxSignatureForm } from "./mailbox-signature-form";
import { ThemeSettings } from "./theme-settings";

export function AccountSettings() {
	const [user, setUser] = useState<AccountSettingsResponse["user"]>();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		loadAccountSettings()
			.then((nextUser) => {
				if (!cancelled) setUser(nextUser);
			})
			.catch((err) => {
				if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load account");
			});

		return () => {
			cancelled = true;
		};
	}, []);

	if (error) {
		return <p className="py-8 text-sm text-red-600">{error}</p>;
	}

	if (!user) {
		return (
			<div className="space-y-6 py-4">
				<Skeleton className="h-9 w-40" />
				<Skeleton className="h-72 w-full rounded-3xl" />
			</div>
		);
	}

	return (
		<div className="space-y-8 py-4">
			<div>
				<h1 className="text-3xl font-medium text-neutral-900">Account & Mailbox Settings</h1>
				<p className="mt-1 text-sm text-neutral-500">Manage your account details, signatures, appearance, and sign-in password.</p>
			</div>

			<ThemeSettings />

			<Card className="rounded-3xl border-0 bg-white px-6">
				<CardHeader>
					<CardTitle>Email Signature</CardTitle>
					<CardDescription>Personalize the signature attached to emails sent from your active mailbox.</CardDescription>
				</CardHeader>
				<CardContent className="pb-6">
					<MailboxSignatureForm />
				</CardContent>
			</Card>

			<Card className="rounded-3xl border-0 bg-white px-6">
				<CardHeader>
					<CardTitle>Account details</CardTitle>
					<CardDescription>Your current email is assigned to this account and cannot be changed here.</CardDescription>
				</CardHeader>
				<CardContent className="pb-6">
					<ProfileForm
						initialName={user.name}
						initialResetEmail={user.resetEmail ?? ""}
						initialForwardingEmail={user.forwardingEmail ?? ""}
						canForwardEmail={user.canForwardEmail}
						email={user.email}
					/>
				</CardContent>
			</Card>

			<Card className="rounded-3xl border-0 bg-white px-6">
				<CardHeader>
					<CardTitle>Change password</CardTitle>
					<CardDescription>Use at least 8 characters for your new password.</CardDescription>
				</CardHeader>
				<CardContent className="pb-6">
					<ChangePasswordForm />
				</CardContent>
			</Card>
		</div>
	);
}
