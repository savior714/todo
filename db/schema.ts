import { eq, sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
});

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  })
);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.identifier, table.token] }),
  })
);

export const authenticators = sqliteTable(
  "authenticators",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: integer("credentialBackedUp", { mode: "boolean" }).notNull(),
    transports: text("transports"),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.userId, table.credentialID] }),
  })
);

export const families = sqliteTable("families", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const userFamilies = sqliteTable("user_families", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  familyId: text("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
});

export const profiles = sqliteTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    role: text("role", { enum: ["admin", "executor"] }).notNull().default("executor"),
    isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    familyIdx: index("profiles_family_idx").on(table.familyId),
  })
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    actionType: text("action_type").notNull(),
    target: text("target").notNull(),
    metadata: text("metadata").notNull().default("{}"),
    isReverted: integer("is_reverted", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    createdDate: text("created_date").notNull(),
  },
  (table) => ({
    familyCreatedIdx: index("events_family_created_idx").on(table.familyId, table.createdAt),
    familyActionCreatedIdx: index("events_family_action_created_idx").on(
      table.familyId,
      table.actionType,
      table.createdAt
    ),
    familyActiveCreatedIdx: index("events_family_active_created_idx")
      .on(table.familyId, table.createdAt)
      .where(eq(table.isReverted, false)),
    familyActionTargetDateUnique: uniqueIndex("events_family_action_target_date_unique_idx").on(
      table.familyId,
      table.actionType,
      table.target,
      table.createdDate
    ),
  })
);

export const dailyPins = sqliteTable(
  "daily_pins",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdBy: text("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    familyActiveUnique: uniqueIndex("daily_pins_active_family_unique_idx")
      .on(table.familyId)
      .where(eq(table.isActive, true)),
    familyIdx: index("daily_pins_family_idx").on(table.familyId),
  })
);

export const homeworkTypes = sqliteTable(
  "homework_types",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    childGroup: text("child_group", { enum: ["kid7", "kid4"] }).notNull(),
    title: text("title").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    familyIdx: index("homework_types_family_idx").on(table.familyId),
    familyChildTitleUnique: uniqueIndex("homework_types_family_child_title_unique_idx").on(
      table.familyId,
      table.childGroup,
      table.title
    ),
  })
);

export const homeworkLogs = sqliteTable(
  "homework_logs",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    homeworkTypeId: text("homework_type_id")
      .notNull()
      .references(() => homeworkTypes.id, { onDelete: "cascade" }),
    dateKey: text("date_key").notNull(),
    completedBy: text("completed_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    isReverted: integer("is_reverted", { mode: "boolean" }).notNull().default(false),
  },
  (table) => ({
    homeworkDateUnique: uniqueIndex("homework_logs_type_date_unique_idx").on(table.homeworkTypeId, table.dateKey),
    familyDateIdx: index("homework_logs_family_date_idx").on(table.familyId, table.dateKey),
  })
);

export const quickActions = sqliteTable(
  "quick_actions",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    actionType: text("action_type").notNull(),
    target: text("target").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    familyActiveSortIdx: index("quick_actions_family_active_sort_idx").on(
      table.familyId,
      table.isActive,
      table.sortOrder
    ),
    familyLabelUnique: uniqueIndex("quick_actions_family_label_unique_idx").on(
      table.familyId,
      table.label
    ),
  })
);

/** 숙제와 무관한 반복 루틴(보호자가 날짜별로 완료 체크). */
export const routineItems = sqliteTable(
  "routine_items",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    target: text("target", { enum: ["kid7", "kid4", "family"] }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    familyIdx: index("routine_items_family_idx").on(table.familyId),
    familyActiveSortIdx: index("routine_items_family_active_sort_idx").on(
      table.familyId,
      table.isActive,
      table.sortOrder
    ),
  })
);

export const routineLogs = sqliteTable(
  "routine_logs",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    routineItemId: text("routine_item_id")
      .notNull()
      .references(() => routineItems.id, { onDelete: "cascade" }),
    dateKey: text("date_key").notNull(),
    completedBy: text("completed_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    isReverted: integer("is_reverted", { mode: "boolean" }).notNull().default(false),
  },
  (table) => ({
    routineDateUnique: uniqueIndex("routine_logs_item_date_unique_idx").on(table.routineItemId, table.dateKey),
    familyDateIdx: index("routine_logs_family_date_idx").on(table.familyId, table.dateKey),
  })
);
