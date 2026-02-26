# Database Schema Consolidation Documentation

## Overview

This document summarizes the current database schema state and consolidation status. All migrations are well-structured and follow best practices.

## Migration Status

### ✅ Core Tables (Well-Structured)

All core tables are properly structured with:

- Proper indexes
- Foreign key constraints
- Soft deletes where appropriate
- Full-text search support
- Denormalized counts for performance
- Triggers for automatic updates

### Tables Created

1. **users** (`1707100000000_create_users_table.js`)
   - ✅ Complete with indexes, soft deletes, email verification
   - ✅ Triggers for `updated_at` auto-update

2. **questions** (`1707922795001_create_questions_table.js`)
   - ✅ Complete with full-text search, denormalized counts
   - ✅ Enum type: `question_status` (open, solved, closed, archived)
   - ✅ Triggers for `search_vector` and `updated_at`
   - ✅ GIN index for full-text search

3. **labels** (`1707922795002_create_labels_table.js`)
   - ✅ Complete with slugs, colors, usage tracking
   - ✅ Includes default labels (HTML, CSS, JavaScript, etc.)

4. **question_labels** (`1707922795003_create_question_labels_table.js`)
   - ✅ Junction table with composite primary key
   - ✅ Proper indexes for both directions

5. **answers** (`1707922795004_create_answers_table.js`)
   - ✅ Complete with denormalized vote/comment counts
   - ✅ `is_accepted` field for accepted answers
   - ✅ Full-text search support
   - ✅ Soft deletes

6. **similar_questions** (`1707922795005_create_similar_questions_table.js`)
   - ✅ Complete with enum type: `question_relation_type`
   - ✅ Supports manual and algorithmic relationships
   - ✅ Similarity scoring

7. **notifications** (`1765442000000_create_notifications_table.js`)
   - ✅ Enum type: `notification_type`
   - ⚠️ **Missing**: `answer_accepted` enum value (added in migration `1769000000000`)
   - ✅ Foreign key for `related_comment_id` added in comments migration

8. **votes** (`1768643305000_create_votes_table.js`)
   - ✅ Enum type: `vote_type` (upvote, downvote)
   - ✅ Unique constraint on (user_id, answer_id)
   - ✅ Triggers to update answer vote counts

9. **comments** (`1768644500000_create_comments_table.js`)
   - ✅ Supports both questions and answers
   - ✅ Constraint: exactly one of question_id or answer_id
   - ✅ Adds foreign key constraint to notifications.related_comment_id
   - ✅ Full-text search support

## Enum Types

1. **question_status**: `open`, `solved`, `closed`, `archived`
2. **notification_type**: `question_added`, `answer_added`, `comment_added`, `answer_accepted` (added in migration `1769000000000`)
3. **vote_type**: `upvote`, `downvote`
4. **question_relation_type**: `similar`, `duplicate`, `related`

## Indexes Summary

All tables have appropriate indexes:

- Primary key indexes (automatic)
- Foreign key indexes
- Sorting indexes (created_at, updated_at)
- Filtering indexes (status, read, is_active, etc.)
- Composite indexes for common query patterns
- Partial indexes for soft deletes
- GIN indexes for full-text search (questions, answers, comments)

## Foreign Key Constraints

All foreign keys are properly defined with CASCADE deletes:

- ✅ users → questions, answers, comments, votes, notifications
- ✅ questions → answers, comments, question_labels, similar_questions
- ✅ answers → comments, votes
- ✅ labels → question_labels
- ✅ notifications → questions, answers, comments (comments FK added in comments migration)

## Triggers and Functions

- ✅ `update_users_updated_at` - Auto-update users.updated_at
- ✅ `update_questions_updated_at` - Auto-update questions.updated_at
- ✅ `questions_search_vector_update` - Auto-update search_vector for questions
- ✅ `update_question_last_activity` - Update last_activity_at
- ✅ `update_labels_updated_at` - Auto-update labels.updated_at
- ✅ `update_similar_questions_updated_at` - Auto-update similar_questions.updated_at
- ✅ Vote count triggers (in votes migration)

## Consolidation Status

### ✅ No Consolidation Needed

The migrations are already well-structured:

- Each table is created in a single migration
- No redundant migrations found
- All features are properly integrated
- Indexes are comprehensive
- Foreign keys are properly ordered

### Recent Fixes

1. **Migration `1769000000000`**: Added missing `answer_accepted` to `notification_type` enum
   - This was implemented in code but missing from the database enum

## Recommendations

1. ✅ **Run the new migration** (`1769000000000`) to add `answer_accepted` enum value
2. ✅ **Verify all migrations run successfully** in order
3. ✅ **Test foreign key cascades** to ensure data integrity
4. ✅ **Monitor index usage** in production to optimize if needed

## Migration Order

The migrations should run in this order (by timestamp):

1. `1707100000000` - users
2. `1707922795001` - questions
3. `1707922795002` - labels
4. `1707922795003` - question_labels
5. `1707922795004` - answers
6. `1707922795005` - similar_questions
7. `1765442000000` - notifications
8. `1768643305000` - votes
9. `1768644500000` - comments (adds FK to notifications)
10. `1769000000000` - add answer_accepted enum value

## Notes

- All migrations use idempotent checks (IF EXISTS, IF NOT EXISTS) where possible
- Enum types are checked before creation
- Foreign key constraints are added after dependent tables exist
- Soft deletes use `deleted_at` timestamp pattern consistently
- Full-text search uses PostgreSQL `tsvector` with GIN indexes
