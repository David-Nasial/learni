-- Mon Cartable : résumés IA + cours réécrit avec annotations (générés à la demande, mis en cache)

alter table cartable_cahiers
  add column if not exists summary_points text[],
  add column if not exists summary_generated_at timestamptz,
  add column if not exists unit_label text not null default 'UA';

alter table cartable_cahiers
  drop constraint if exists cartable_cahiers_unit_label_check;
alter table cartable_cahiers
  add constraint cartable_cahiers_unit_label_check check (unit_label in ('UA', 'Chapitre'));

alter table cartable_uas
  add column if not exists summary_points text[],
  add column if not exists rewritten_content text,
  add column if not exists rewritten_comments jsonb,
  add column if not exists content_generated_at timestamptz;
