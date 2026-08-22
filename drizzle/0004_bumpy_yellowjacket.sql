CREATE TABLE `user_certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`certificateCode` varchar(64) NOT NULL,
	`courseTitle` varchar(256) NOT NULL DEFAULT 'TradeFlow Professional Trading Masterclass',
	`recipientName` varchar(256) NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_certificates_id` PRIMARY KEY(`id`)
);
