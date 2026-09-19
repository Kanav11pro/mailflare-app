export interface AttachmentContent {
	content: ArrayBuffer | Uint8Array;
	contentId?: string | null;
	disposition?: "attachment" | "inline";
	filename: string;
	type: string;
}

export interface AttachmentMetadata {
	contentId: string | null;
	disposition: "attachment" | "inline";
	filename: string;
	id: string;
	messageId: string;
	size: number;
	type: string;
}

export interface StoredAttachment extends AttachmentMetadata {
	r2Key: string;
}
