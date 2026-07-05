export interface PasswordProtectionLabels {
	title: string;
	description: string;
	placeholder: string;
	unlock: string;
	unlocking: string;
	incorrect: string;
	passwordRequired: string;
	decryptionError: string;
	passwordDecryptRetry: string;
}

export interface PasswordProtectionClientConfig {
	encryptedContent: string;
	labels: PasswordProtectionLabels;
}
