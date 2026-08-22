CREATE TABLE `user_lesson_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lessonId` varchar(128) NOT NULL,
	`isCompleted` boolean NOT NULL DEFAULT true,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_lesson_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_quiz_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lessonId` varchar(128) NOT NULL,
	`score` int NOT NULL,
	`totalQuestions` int NOT NULL,
	`passed` boolean NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_quiz_scores_id` PRIMARY KEY(`id`)
);
