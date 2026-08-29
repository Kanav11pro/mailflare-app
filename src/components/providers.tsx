"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { clearMailboxClientState } from "@/components/mailbox-provider-utils";
import { BrandingProvider } from "@/components/branding-provider";
import { NewMessagePopup } from "@/components/new-message-popup";
import { useMessagePolling } from "@/hooks/use-message-polling";
import { clearMessageClientState } from "@/hooks/utils";
import { clearMessageDetailCache } from "@/lib/messages/detail-cache";
import { AUTH_SESSION_CHANGED_EVENT } from "@/lib/auth/client";

import { ThemeProvider } from "next-themes";

import { UndoSendProvider } from "@/components/compose/undo-send-context";
import { UndoSendToast } from "@/components/compose/undo-send-toast";

export function Providers({ children }: { children: React.ReactNode }) {
	const realtime = useMessagePolling();

	const [client] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnMount: false,
						refetchOnReconnect: false,
						refetchOnWindowFocus: false,
						staleTime: 60_000,
					},
				},
			}),
	);

	useEffect(() => {
		function resetUserScopedState() {
			client.clear();
			clearMailboxClientState();
			clearMessageClientState();
			clearMessageDetailCache();
		}

		window.addEventListener(AUTH_SESSION_CHANGED_EVENT, resetUserScopedState);
		return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, resetUserScopedState);
	}, [client]);

	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
			<QueryClientProvider client={client}>
				<BrandingProvider>
					<UndoSendProvider>
						{children}
						<UndoSendToast />
						{realtime.notification && (
							<NewMessagePopup
								notification={realtime.notification}
								onDismiss={realtime.dismissNotification}
							/>
						)}
					</UndoSendProvider>
				</BrandingProvider>
			</QueryClientProvider>
		</ThemeProvider>
	);
}
