CREATE TABLE `buckets` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`cache` text NOT NULL,
	`access_key` text NOT NULL,
	`secret_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
