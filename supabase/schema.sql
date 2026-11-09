-- FenoSearch: relatos, comentários, curtidas, denúncias.
-- Rodar uma vez no SQL Editor do Supabase.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nick text unique not null check (nick ~ '^[a-z0-9_.]{3,24}$'),
  bio text check (char_length(bio) <= 280),
  is_admin boolean not null default false,
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reports (            -- relatos
  id bigint generated always as identity primary key,
  strain_id text not null,
  user_id uuid not null references public.profiles on delete cascade,
  ctx text not null check (ctx in ('consumo','cultivo')),
  rating smallint not null check (rating between 1 and 5),
  effects text[] not null default '{}',
  aromas text[] not null default '{}',
  flavors text[] not null default '{}',
  flower_weeks numeric(4,1) check (flower_weeks between 4 and 20),
  yield_g numeric(7,1) check (yield_g >= 0),
  yield_unit text check (yield_unit in ('g/planta','g/m2')),
  difficulty text check (difficulty in ('fácil','moderada','difícil')),
  body text not null check (char_length(body) between 20 and 4000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (strain_id, user_id, ctx)
);
create index on public.reports (strain_id, created_at desc);
create index on public.reports (user_id, created_at desc);

create table public.comments (
  id bigint generated always as identity primary key,
  report_id bigint not null references public.reports on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.comments (report_id, created_at);

create table public.likes (
  report_id bigint not null references public.reports on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table public.flags (              -- denúncias
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  report_id bigint references public.reports on delete cascade,
  comment_id bigint references public.comments on delete cascade,
  reason text not null check (reason in ('comércio','ofensa','spam','dados pessoais','outro')),
  note text check (char_length(note) <= 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  check ((report_id is null) <> (comment_id is null))
);

-- resumo por strain para a ficha
create view public.strain_stats with (security_invoker = on) as
select strain_id, count(*) n, round(avg(rating)::numeric, 2) avg_rating
from public.reports where not hidden group by strain_id;

-- helpers
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select is_admin from profiles where id = auth.uid()), false) $$;
create function public.can_post() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and not banned) $$;

create function public.touch() returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;
create trigger reports_touch before update on public.reports for each row execute function public.touch();

-- usuário comum não pode se promover a admin nem se desbanir
create function public.guard_profile() returns trigger language plpgsql security definer set search_path = public as
$$ begin
  if auth.uid() is not null and not public.is_admin() then new.is_admin = old.is_admin; new.banned = old.banned; end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile();

-- autor não pode reexibir relato escondido pela moderação
create function public.guard_hidden() returns trigger language plpgsql security definer set search_path = public as
$$ begin
  if auth.uid() is not null and not public.is_admin() then new.hidden = old.hidden; end if;
  return new;
end $$;
create trigger reports_guard before update on public.reports for each row execute function public.guard_hidden();

-- RLS
alter table public.profiles enable row level security;
alter table public.reports  enable row level security;
alter table public.comments enable row level security;
alter table public.likes    enable row level security;
alter table public.flags    enable row level security;

create policy "perfis públicos" on public.profiles for select using (true);
create policy "cria o próprio perfil" on public.profiles for insert with check (id = auth.uid() and not is_admin and not banned);
create policy "edita o próprio perfil" on public.profiles for update using (id = auth.uid() or public.is_admin());

create policy "relatos visíveis" on public.reports for select using (not hidden or user_id = auth.uid() or public.is_admin());
create policy "publica relato" on public.reports for insert with check (user_id = auth.uid() and public.can_post() and not hidden);
create policy "edita relato" on public.reports for update using (user_id = auth.uid() or public.is_admin());
create policy "apaga relato" on public.reports for delete using (user_id = auth.uid() or public.is_admin());

create policy "comentários visíveis" on public.comments for select using (not hidden or user_id = auth.uid() or public.is_admin());
create policy "comenta" on public.comments for insert with check (user_id = auth.uid() and public.can_post() and not hidden);
create policy "modera comentário" on public.comments for update using (public.is_admin());
create policy "apaga comentário" on public.comments for delete using (user_id = auth.uid() or public.is_admin());

create policy "curtidas públicas" on public.likes for select using (true);
create policy "curte" on public.likes for insert with check (user_id = auth.uid() and public.can_post());
create policy "descurte" on public.likes for delete using (user_id = auth.uid());

create policy "denuncia" on public.flags for insert with check (user_id = auth.uid());
create policy "admin vê denúncias" on public.flags for select using (public.is_admin() or user_id = auth.uid());
create policy "admin resolve" on public.flags for update using (public.is_admin());

-- Depois de criar sua conta no site, rode (trocando o apelido):
-- update public.profiles set is_admin = true where nick = 'seu_apelido';
