# Milu Beauty — Inventario y Ventas

App para gestionar ventas, inventario, clientes y estadísticas de un negocio de maquillaje. Hecha con Next.js + Supabase.

## 1. Crear el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com/dashboard) y crea un proyecto nuevo (gratis).
2. Cuando esté listo, entra a **Project Settings → API** y copia:
   - `Project URL`
   - `anon public` key
3. En este proyecto, copia el archivo `.env.local.example` a `.env.local` y pega esos valores:

   ```bash
   cp .env.local.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```

## 2. Crear las tablas

1. En el panel de Supabase entra a **SQL Editor**.
2. Copia y pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo (botón "Run").
   Esto crea las tablas `clientes`, `productos`, `ventas`, `venta_items`, las funciones para
   registrar ventas/reponer stock, y las políticas de seguridad (cada usuario solo ve sus propios datos).

## 3. Confirmación de correo (opcional)

Por defecto Supabase pide confirmar el correo al registrarse. Si quieres que el registro sea inmediato
(sin revisar el correo), ve a **Authentication → Providers → Email** y desactiva "Confirm email".

## 4. Correr la app

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), regístrate con tu correo y contraseña, y listo.

## Cómo funciona

- **Clientes**: alta/edición/borrado de clientes. También se pueden crear directamente desde el formulario de una venta nueva.
- **Inventario**: cada producto tiene costo, precio de venta y stock. El stock se muestra como `ingresado/actual`
  (por ejemplo `12/10`: entraron 12 y quedan 10 disponibles). "Reponer stock" registra una nueva entrada de mercancía.
- **Ventas**: al registrar una venta se elige (o crea) un cliente y se agregan productos con su cantidad; el inventario
  se descuenta automáticamente. Se puede eliminar una venta, lo que restituye el stock.
- **Estadísticas**: ventas totales, costo de mercancía vendida y ganancia, con gráfica de ventas por día y top de productos,
  filtrable por periodo.

Todos los datos están protegidos con Row Level Security: cada cuenta solo ve su propia información.
