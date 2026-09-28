-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Preparar la base para la demo pública
-- ════════════════════════════════════════════════════════════════════════
-- Deja un set de datos limpio y coherente para repartir el link de la landing.
--
-- ⚠️ BORRA DATOS. Correr por PARTES, mirando el resultado de cada una. Cada
-- bloque destructivo viene precedido de un SELECT que muestra qué se va a
-- borrar: corré ese primero.
--
-- Qué NO toca: barrios, administración, prestadores, verificaciones y
-- habilitaciones. Todo el catálogo se conserva tal cual está — incluidos los
-- jardineros que hayas dado de alta a mano probando.
--
-- Si en cambio querés volver al set original de cero, no uses este archivo:
-- corré seed.sql, que empieza con un truncate y recarga todo (ver nota al pie).
-- ════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════
-- PARTE 1 · Ver qué hay antes de borrar nada
-- ════════════════════════════════════════════════════════════════════════
select 'pedidos' as que, count(*) from pedido
union all select 'solicitudes', count(*) from solicitud
union all select 'reseñas de prueba (con solicitud)', count(*) from valoracion where solicitud_id is not null
union all select 'reseñas del seed (sin solicitud)', count(*) from valoracion where solicitud_id is null
union all select 'prestadores sugeridos', count(*) from prestador_sugerido;


-- ════════════════════════════════════════════════════════════════════════
-- PARTE 2 · Borrar lo transaccional que generaron las pruebas
-- ════════════════════════════════════════════════════════════════════════
-- El orden importa: las reseñas y las solicitudes cuelgan del pedido.
--
-- Las reseñas del seed (solicitud_id nulo) se conservan a propósito: son las
-- que le dan puntaje al directorio. Sin ellas, todos los jardineros aparecen
-- "Sin reseñas aún" y la pantalla que el visitante ve primero pierde el sentido.

delete from valoracion where solicitud_id is not null;
delete from solicitud;
delete from pedido;

-- Sugerencias de prestadores cargadas probando.
delete from prestador_sugerido;


-- ════════════════════════════════════════════════════════════════════════
-- PARTE 3 · Completar lo que el seed no llena
-- ════════════════════════════════════════════════════════════════════════
-- El seed es anterior a varias migraciones, así que deja en su valor por
-- defecto las columnas nuevas. Sin esto, funciones que ya existen se ven vacías.

-- ── Urgencias ───────────────────────────────────────────────────────────
-- Sin al menos un par disponibles, el filtro "⚡ Solo urgencias" devuelve una
-- lista vacía y parece que la función no anda. Se prenden los dos mejor
-- calificados que estén habilitados en algún barrio: es lo que un vecino
-- esperaría encontrar.
update prestador set disponible_urgencia = true
 where id in (
   select p.id
     from prestador p
     join prestador_barrio pb on pb.prestador_id = p.id and pb.habilitado
     left join valoracion v on v.prestador_id = p.id
    group by p.id
    order by avg(v.puntaje) desc nulls last
    limit 2
 );

-- ── DNI ─────────────────────────────────────────────────────────────────
-- Es contra este número que la administración valida la identidad. Ficticio,
-- con formato válido, para que la pantalla de validación no se vea incompleta.
update prestador
   set documento = to_char(20000000 + (abs(hashtext(id::text)) % 20000000), 'FM99999999')
 where documento is null;

update integrante
   set documento = to_char(20000000 + (abs(hashtext(id::text)) % 20000000), 'FM99999999')
 where documento is null or documento = '';


-- ════════════════════════════════════════════════════════════════════════
-- PARTE 4 · Comprobar que la demo se ve bien
-- ════════════════════════════════════════════════════════════════════════
-- Lo que un visitante tiene que encontrar al entrar como propietario.
select b.nombre as barrio,
       count(*) filter (where pb.habilitado)                as habilitados,
       count(*) filter (where p.disponible_urgencia)        as con_urgencia,
       count(*) filter (where p.documento is not null)      as con_dni
  from barrio b
  join prestador_barrio pb on pb.barrio_id = b.id
  join prestador p on p.id = pb.prestador_id
 group by b.nombre
 order by b.nombre;

-- Puntajes visibles en el directorio.
select p.nombre, p.apellido,
       round(avg(v.puntaje), 2) as puntaje,
       count(v.id)              as resenas
  from prestador p
  left join valoracion v on v.prestador_id = p.id
 group by p.id, p.nombre, p.apellido
 order by puntaje desc nulls last;

-- Todo vacío: nadie tiene pedidos en curso.
select count(*) as pedidos_abiertos from pedido;


-- ════════════════════════════════════════════════════════════════════════
-- NOTA · Si preferís volver al set original de cero
-- ════════════════════════════════════════════════════════════════════════
-- Corré seed.sql en lugar de este archivo. Ojo con dos cosas:
--
--   1. Borra TODO, incluidos los jardineros que hayas cargado a mano.
--   2. Su truncate no nombra `pedido` ni `prestador_sugerido` (son posteriores).
--      Se limpian igual por el CASCADE, porque referencian a barrio, pero
--      conviene agregarlos a la lista para que la intención quede explícita.
--
-- Después de correr seed.sql hay que volver a correr la PARTE 3 de este
-- archivo, o la demo queda otra vez sin urgencias ni DNI.
