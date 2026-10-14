-- Learning personalization metadata for Magic Village
-- Derived memory half-life / dashboard metrics are intentionally NOT persisted.
-- They are recomputed from immutable attempt evidence so the model can evolve.

alter table public.magic_learning_attempts
  add column if not exists purpose text,
  add column if not exists strategy text;

alter table public.magic_learning_attempts
  drop constraint if exists magic_learning_attempts_purpose_check,
  add constraint magic_learning_attempts_purpose_check
    check (purpose is null or purpose in ('foundation','review','challenge','transfer'));

alter table public.magic_learning_attempts
  drop constraint if exists magic_learning_attempts_strategy_check,
  add constraint magic_learning_attempts_strategy_check
    check (strategy is null or strategy in ('adaptive','review'));

alter table public.magic_round_receipts
  add column if not exists purpose text,
  add column if not exists strategy text;

alter table public.magic_round_receipts
  drop constraint if exists magic_round_receipts_purpose_check,
  add constraint magic_round_receipts_purpose_check
    check (purpose is null or purpose in ('foundation','review','challenge','transfer'));

alter table public.magic_round_receipts
  drop constraint if exists magic_round_receipts_strategy_check,
  add constraint magic_round_receipts_strategy_check
    check (strategy is null or strategy in ('adaptive','review'));

create index if not exists magic_learning_attempts_personalization_idx
  on public.magic_learning_attempts(learner_id, answered_at desc, purpose)
  where assisted = false;

comment on column public.magic_learning_attempts.purpose is
  'Learning-loop purpose: foundation/review/challenge/transfer. Not a diagnosis.';
comment on column public.magic_learning_attempts.strategy is
  'Item-selection strategy: adaptive/review.';
