CREATE TABLE `assistant_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assistant_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(128) NOT NULL,
	`entity` varchar(64),
	`entityId` varchar(64),
	`details` json,
	`ipAddress` varchar(64),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `copy_trading_relations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`traderId` int NOT NULL,
	`copyRatio` decimal(5,2) DEFAULT '1.00',
	`maxLotSize` decimal(10,4) DEFAULT '1.0000',
	`isActive` boolean NOT NULL DEFAULT true,
	`totalCopied` int DEFAULT 0,
	`totalProfit` decimal(20,8) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `copy_trading_relations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `economic_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`country` varchar(4) NOT NULL,
	`currency` varchar(8),
	`impact` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`actual` varchar(32),
	`forecast` varchar(32),
	`previous` varchar(32),
	`scheduledAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `economic_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `instruments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`name` text NOT NULL,
	`category` enum('forex','crypto','commodity','stock','index','binary','synthetic') NOT NULL,
	`baseCurrency` varchar(8),
	`quoteCurrency` varchar(8),
	`pipSize` decimal(18,8) DEFAULT '0.00010',
	`contractSize` decimal(18,4) DEFAULT '100000',
	`minLot` decimal(10,4) DEFAULT '0.01',
	`maxLot` decimal(10,2) DEFAULT '100',
	`maxLeverage` int DEFAULT 100,
	`marginRequirement` decimal(8,4) DEFAULT '1.0000',
	`tradingHoursStart` varchar(8) DEFAULT '00:00',
	`tradingHoursEnd` varchar(8) DEFAULT '23:59',
	`tradingDays` varchar(32) DEFAULT '1,2,3,4,5',
	`isActive` boolean NOT NULL DEFAULT true,
	`spread` decimal(10,5) DEFAULT '0.00020',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `instruments_id` PRIMARY KEY(`id`),
	CONSTRAINT `instruments_symbol_unique` UNIQUE(`symbol`)
);
--> statement-breakpoint
CREATE TABLE `kyc_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentType` enum('passport','national_id','drivers_license','utility_bill','bank_statement') NOT NULL,
	`documentUrl` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kyc_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('margin_call','price_alert','trade_execution','withdrawal_update','kyc_update','system','copy_trade') NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`condition` enum('above','below') NOT NULL,
	`targetPrice` decimal(18,8) NOT NULL,
	`isTriggered` boolean NOT NULL DEFAULT false,
	`triggeredAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referredUserId` int NOT NULL,
	`commissionRate` decimal(5,4) DEFAULT '0.1000',
	`totalCommission` decimal(20,8) DEFAULT '0',
	`status` enum('pending','active','paid') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trader_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(64) NOT NULL,
	`bio` text,
	`avatarUrl` text,
	`isPublic` boolean NOT NULL DEFAULT false,
	`allowCopying` boolean NOT NULL DEFAULT false,
	`totalTrades` int DEFAULT 0,
	`winRate` decimal(5,2) DEFAULT '0',
	`totalProfit` decimal(20,8) DEFAULT '0',
	`monthlyReturn` decimal(8,4) DEFAULT '0',
	`maxDrawdown` decimal(8,4) DEFAULT '0',
	`followersCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trader_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `trader_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`walletId` int NOT NULL,
	`instrumentId` int NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`type` enum('buy','sell','buy_limit','sell_limit','buy_stop','sell_stop') NOT NULL,
	`status` enum('open','closed','pending','cancelled') NOT NULL DEFAULT 'open',
	`lotSize` decimal(10,4) NOT NULL,
	`openPrice` decimal(18,8) NOT NULL,
	`closePrice` decimal(18,8),
	`stopLoss` decimal(18,8),
	`takeProfit` decimal(18,8),
	`margin` decimal(20,8) NOT NULL,
	`profit` decimal(20,8) DEFAULT '0',
	`swap` decimal(20,8) DEFAULT '0',
	`commission` decimal(20,8) DEFAULT '0',
	`leverage` int DEFAULT 100,
	`copiedFromTradeId` int,
	`copiedFromUserId` int,
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`expiresAt` timestamp,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trading_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`direction` enum('buy','sell','neutral') NOT NULL,
	`entryPrice` decimal(18,8),
	`stopLoss` decimal(18,8),
	`takeProfit` decimal(18,8),
	`confidence` int DEFAULT 50,
	`analysis` text,
	`source` varchar(64) DEFAULT 'ai',
	`isActive` boolean NOT NULL DEFAULT true,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trading_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`walletId` int NOT NULL,
	`type` enum('deposit','withdrawal','trade_profit','trade_loss','bonus','commission','fee','transfer') NOT NULL,
	`amount` decimal(20,8) NOT NULL,
	`currency` varchar(8) NOT NULL,
	`status` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`reference` varchar(128),
	`stripePaymentIntentId` varchar(128),
	`description` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currency` varchar(8) NOT NULL,
	`balance` decimal(20,8) NOT NULL DEFAULT '0',
	`equity` decimal(20,8) NOT NULL DEFAULT '0',
	`margin` decimal(20,8) NOT NULL DEFAULT '0',
	`freeMargin` decimal(20,8) NOT NULL DEFAULT '0',
	`marginLevel` decimal(10,2) NOT NULL DEFAULT '0',
	`leverage` int NOT NULL DEFAULT 100,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorSecret` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `kycStatus` enum('pending','submitted','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `kycSubmittedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `kycReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `kycNotes` text;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `country` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `dateOfBirth` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `address` text;--> statement-breakpoint
ALTER TABLE `users` ADD `preferredLanguage` varchar(8) DEFAULT 'en';--> statement-breakpoint
ALTER TABLE `users` ADD `accountType` enum('standard','professional') DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `referralCode` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `referredBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `emailNotifications` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `inAppNotifications` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `termsAcceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `riskDisclosureAcceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_referralCode_unique` UNIQUE(`referralCode`);