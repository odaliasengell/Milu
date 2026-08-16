-- Esquema para inventario de ventas de maquillaje
-- Ejecutar en el SQL Editor de tu proyecto de Supabase (https://app.supabase.com)

-- Extensión para generar UUIDs
create extension if not exists "pgcrypto";

-- ========== CLIENTES ==========
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  telefono text,
  email text,
  notas text,
  created_at timestamptz not null default now()
);

alter table clientes enable row level security;

create policy "clientes_select_own" on clientes for select
  using (user_id = auth.uid());
create policy "clientes_insert_own" on clientes for insert
  with check (user_id = auth.uid());
create policy "clientes_update_own" on clientes for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clientes_delete_own" on clientes for delete
  using (user_id = auth.uid());

-- ========== PRODUCTOS (INVENTARIO) ==========
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  categoria text,
  descripcion text,
  costo numeric(10,2) not null default 0,
  precio numeric(10,2) not null default 0,
  cantidad_ingresada integer not null default 0,
  cantidad_actual integer not null default 0,
  visible_catalogo boolean not null default false,
  imagen_url text,
  created_at timestamptz not null default now()
);

-- Por si la tabla ya existía de una instalación previa del esquema
alter table productos add column if not exists visible_catalogo boolean not null default false;
alter table productos add column if not exists imagen_url text;
alter table productos add column if not exists descripcion text;

alter table productos enable row level security;

create policy "productos_select_own" on productos for select
  using (user_id = auth.uid());
create policy "productos_insert_own" on productos for insert
  with check (user_id = auth.uid());
create policy "productos_update_own" on productos for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "productos_delete_own" on productos for delete
  using (user_id = auth.uid());

-- Catálogo público: cualquier visitante (sin iniciar sesión) puede ver
-- SOLO los productos marcados como visibles, y SOLO estas columnas
-- (nunca el costo ni datos internos). Esto es lo que usa la página /catalogo.
create policy "productos_select_publico" on productos for select
  to anon
  using (visible_catalogo = true);

revoke select on productos from anon;
grant select (id, nombre, categoria, descripcion, precio, imagen_url, cantidad_actual) on productos to anon;

-- ========== VENTAS ==========
create table if not exists ventas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid references clientes(id) on delete set null,
  fecha timestamptz not null default now(),
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table ventas enable row level security;

create policy "ventas_select_own" on ventas for select
  using (user_id = auth.uid());
create policy "ventas_insert_own" on ventas for insert
  with check (user_id = auth.uid());
create policy "ventas_update_own" on ventas for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ventas_delete_own" on ventas for delete
  using (user_id = auth.uid());

-- ========== ITEMS DE VENTA (detalle) ==========
create table if not exists venta_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  venta_id uuid not null references ventas(id) on delete cascade,
  producto_id uuid not null references productos(id),
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null,
  costo_unitario numeric(10,2) not null,
  subtotal numeric(10,2) not null
);

alter table venta_items enable row level security;

create policy "venta_items_select_own" on venta_items for select
  using (user_id = auth.uid());
create policy "venta_items_insert_own" on venta_items for insert
  with check (user_id = auth.uid());
create policy "venta_items_delete_own" on venta_items for delete
  using (user_id = auth.uid());

-- ========== FUNCIÓN: registrar entrada de mercancía ==========
-- Suma a lo ingresado históricamente y al stock actual (formato 12/10: ingresado/actual)
create or replace function reponer_stock(p_producto_id uuid, p_cantidad integer)
returns void
language plpgsql
security invoker
as $$
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad a reponer debe ser mayor a 0';
  end if;

  update productos
  set cantidad_ingresada = cantidad_ingresada + p_cantidad,
      cantidad_actual = cantidad_actual + p_cantidad
  where id = p_producto_id and user_id = auth.uid();

  if not found then
    raise exception 'Producto no encontrado';
  end if;
end;
$$;

-- ========== FUNCIÓN: crear venta con items y descontar inventario ==========
-- items: jsonb array de objetos { "producto_id": uuid, "cantidad": int }
create or replace function crear_venta(p_cliente_id uuid, p_items jsonb)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_venta_id uuid;
  v_item jsonb;
  v_producto productos%rowtype;
  v_total numeric(10,2) := 0;
  v_subtotal numeric(10,2);
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un producto';
  end if;

  insert into ventas (user_id, cliente_id, total)
  values (auth.uid(), p_cliente_id, 0)
  returning id into v_venta_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_producto
    from productos
    where id = (v_item->>'producto_id')::uuid and user_id = auth.uid()
    for update;

    if not found then
      raise exception 'Producto no encontrado: %', (v_item->>'producto_id');
    end if;

    if v_producto.cantidad_actual < (v_item->>'cantidad')::integer then
      raise exception 'Stock insuficiente para "%": disponible %, solicitado %',
        v_producto.nombre, v_producto.cantidad_actual, (v_item->>'cantidad')::integer;
    end if;

    v_subtotal := v_producto.precio * (v_item->>'cantidad')::integer;
    v_total := v_total + v_subtotal;

    insert into venta_items (user_id, venta_id, producto_id, cantidad, precio_unitario, costo_unitario, subtotal)
    values (auth.uid(), v_venta_id, v_producto.id, (v_item->>'cantidad')::integer, v_producto.precio, v_producto.costo, v_subtotal);

    update productos
    set cantidad_actual = cantidad_actual - (v_item->>'cantidad')::integer
    where id = v_producto.id;
  end loop;

  update ventas set total = v_total where id = v_venta_id;

  return v_venta_id;
end;
$$;

-- ========== FUNCIÓN: editar venta (reemplaza cliente e items, ajustando inventario) ==========
-- items: jsonb array de objetos { "producto_id": uuid, "cantidad": int }
create or replace function editar_venta(p_venta_id uuid, p_cliente_id uuid, p_items jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  v_item jsonb;
  v_producto productos%rowtype;
  v_total numeric(10,2) := 0;
  v_subtotal numeric(10,2);
  v_old record;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un producto';
  end if;

  perform 1 from ventas where id = p_venta_id and user_id = auth.uid();
  if not found then
    raise exception 'Venta no encontrada';
  end if;

  -- Restituye el stock de los items actuales antes de aplicar los nuevos
  for v_old in
    select producto_id, cantidad from venta_items
    where venta_id = p_venta_id and user_id = auth.uid()
  loop
    update productos
    set cantidad_actual = cantidad_actual + v_old.cantidad
    where id = v_old.producto_id and user_id = auth.uid();
  end loop;

  delete from venta_items where venta_id = p_venta_id and user_id = auth.uid();

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_producto
    from productos
    where id = (v_item->>'producto_id')::uuid and user_id = auth.uid()
    for update;

    if not found then
      raise exception 'Producto no encontrado: %', (v_item->>'producto_id');
    end if;

    if v_producto.cantidad_actual < (v_item->>'cantidad')::integer then
      raise exception 'Stock insuficiente para "%": disponible %, solicitado %',
        v_producto.nombre, v_producto.cantidad_actual, (v_item->>'cantidad')::integer;
    end if;

    v_subtotal := v_producto.precio * (v_item->>'cantidad')::integer;
    v_total := v_total + v_subtotal;

    insert into venta_items (user_id, venta_id, producto_id, cantidad, precio_unitario, costo_unitario, subtotal)
    values (auth.uid(), p_venta_id, v_producto.id, (v_item->>'cantidad')::integer, v_producto.precio, v_producto.costo, v_subtotal);

    update productos
    set cantidad_actual = cantidad_actual - (v_item->>'cantidad')::integer
    where id = v_producto.id;
  end loop;

  update ventas set cliente_id = p_cliente_id, total = v_total where id = p_venta_id and user_id = auth.uid();
end;
$$;

-- ========== FUNCIÓN: eliminar venta y restituir inventario ==========
create or replace function eliminar_venta(p_venta_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_item record;
begin
  for v_item in
    select producto_id, cantidad from venta_items
    where venta_id = p_venta_id and user_id = auth.uid()
  loop
    update productos
    set cantidad_actual = cantidad_actual + v_item.cantidad
    where id = v_item.producto_id and user_id = auth.uid();
  end loop;

  delete from ventas where id = p_venta_id and user_id = auth.uid();
end;
$$;

-- Índices útiles
create index if not exists idx_ventas_user_fecha on ventas(user_id, fecha desc);
create index if not exists idx_venta_items_venta on venta_items(venta_id);
create index if not exists idx_productos_user on productos(user_id);
create index if not exists idx_clientes_user on clientes(user_id);

-- ========== STORAGE: fotos de productos ==========
-- Bucket público para poder mostrar las fotos en /catalogo sin necesitar sesión.
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

create policy "productos_fotos_select_publico" on storage.objects for select
  using (bucket_id = 'productos');

create policy "productos_fotos_insert_propio" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'productos');

create policy "productos_fotos_update_propio" on storage.objects for update
  to authenticated
  using (bucket_id = 'productos');

create policy "productos_fotos_delete_propio" on storage.objects for delete
  to authenticated
  using (bucket_id = 'productos');
