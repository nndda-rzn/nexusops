-- Q-08 FIX: Add delay_reason column to rail.trains
-- Separates delay reason from cancellation_reason — semantically distinct fields.

ALTER TABLE "rail"."trains" ADD COLUMN "delay_reason" text;
