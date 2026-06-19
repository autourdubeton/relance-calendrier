create table clients (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  sujet text not null,
  email_client text,
  date_debut date,
  date_promise date,
  date_rappel_1 date,
  date_rappel_2 date,
  notes text,
  statut text default 'en cours'
);

-- Si la table existe déjà, ajouter la colonne :
-- alter table clients add column if not exists email_client text;
