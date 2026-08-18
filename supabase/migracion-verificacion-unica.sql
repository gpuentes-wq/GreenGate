-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: UNA verificación por prestador (y por integrante)
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase, DESPUÉS de desplegar el
-- código que deja de duplicar verificaciones al sumar un barrio.
--
-- Problema que resuelve: hasta ahora, cada vez que un prestador sumaba un
-- barrio se creaba un juego nuevo de las tres verificaciones. Un prestador en
-- dos barrios terminaba con dos seguros/ART: una copia vieja y vencida
-- conviviendo con la vigente. Como badgesPrestador() usa .some(), la insignia
-- salía bien, pero las alertas mostraban "vencido hace N días" al mismo
-- tiempo — la pantalla se contradecía a sí misma.
--
-- Decisión de fondo: los antecedentes y la identidad son hechos sobre una
-- persona, y el seguro es una póliza. Ninguno cambia por trabajar en otro
-- barrio. Lo que sí varía por barrio es QUÉ documentación se exige, y para eso
-- ya existen barrio.requiere_antecedentes / requiere_seguro_art /
-- requiere_identidad (todavía sin UI). Ver docs/spec-jardinero.md.
--
-- verificacion.barrio_id queda en la tabla pero deja de escribirse: ninguna
-- consulta la lee. No se elimina porque borrar una columna es irreversible.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1) Revisar qué duplicados hay (no modifica nada) ────────────────────
select prestador_id, integrante_id, tipo, count(*) as copias
  from verificacion
 group by prestador_id, integrante_id, tipo
having count(*) > 1
 order by copias desc;

-- ── 2) Deduplicar ───────────────────────────────────────────────────────
-- De cada grupo se conserva UNA fila, eligiendo en este orden:
--   a) la de vencimiento más lejano (sin fecha = no vence, gana)
--   b) ante empate, la validada más recientemente
--   c) ante empate, la creada más recientemente
-- Así nunca se descarta una verificación vigente en favor de una vencida.
with ranking as (
  select id,
         row_number() over (
           partition by prestador_id, integrante_id, tipo
           order by (fecha_vencimiento is null) desc,
                    fecha_vencimiento desc nulls last,
                    validado_en desc nulls last,
                    created_at desc
         ) as puesto
    from verificacion
)
delete from verificacion
 where id in (select id from ranking where puesto > 1);

-- ── 3) Que no vuelva a pasar ────────────────────────────────────────────
-- Dos índices parciales en vez de un unique común: en Postgres los NULL no
-- chocan entre sí, así que un unique sobre (prestador_id, integrante_id, tipo)
-- dejaría sin proteger justamente las filas del prestador (integrante_id null),
-- que son las que se estaban duplicando.
create unique index if not exists verificacion_unica_prestador
    on verificacion (prestador_id, tipo)
 where integrante_id is null;

create unique index if not exists verificacion_unica_integrante
    on verificacion (prestador_id, integrante_id, tipo)
 where integrante_id is not null;

-- ── 4) Comprobar que quedó limpio (debe devolver 0 filas) ───────────────
select prestador_id, integrante_id, tipo, count(*)
  from verificacion
 group by prestador_id, integrante_id, tipo
having count(*) > 1;
