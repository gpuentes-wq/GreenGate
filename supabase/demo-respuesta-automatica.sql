-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Respuesta automática de los jardineros del barrio demo
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente
-- (`create or replace` + `drop trigger if exists`).
--
-- Por qué. Sin esto la demo muestra apenas el primer cuarto del circuito: el
-- visitante pide una visita, las solicitudes quedan en 'pendiente' para
-- siempre y nunca llega a ver lo que hace distinto al producto —comparar
-- desde cuándo puede ir cada uno, elegir, el contacto, la reseña—.
--
-- Por qué en la base y no en la app:
--
--   1. Funciona aunque el visitante cierre la pestaña y vuelva mañana.
--   2. No mete lógica de demostración en el código del producto.
--   3. Queda acotado al barrio demo por la misma condición que aísla todo lo
--      demás: un pedido de un barrio real no lo toca ni por error.
--
-- Las respuestas son deliberadamente DISTINTAS entre sí. La gracia de la
-- pantalla es comparar: si los cinco contestaran lo mismo, no habría nada que
-- decidir y la demo no mostraría el valor del producto.
--
-- Depende de supabase/seed-barrio-demo.sql.
-- ════════════════════════════════════════════════════════════════════════

create or replace function demo_responder_solicitud()
returns trigger
language plpgsql
as $$
declare
  barrio_demo constant uuid := 'dd000000-0000-0000-0000-000000000001';
  v_barrio  uuid;
  v_urgente boolean;
  v_dias    int;
  v_urg_ok  boolean;
begin
  -- El pedido ya existe cuando entran sus solicitudes: la app inserta primero
  -- el pedido y después una solicitud por cada jardinero elegido.
  select p.barrio_id, coalesce(p.es_urgencia, false)
    into v_barrio, v_urgente
    from pedido p
   where p.id = new.pedido_id;

  -- Cualquier barrio que no sea el demo sale por acá sin tocarse.
  if v_barrio is distinct from barrio_demo then
    return new;
  end if;

  -- Ezequiel no contesta, a propósito. Es lo más realista y además enseña
  -- algo: en la vida real no responden todos, y la pantalla tiene que
  -- mostrarlo. Sin un caso así, la demo promete algo que no va a cumplir.
  if new.prestador_id = 'd0000000-0000-0000-0000-000000000005' then
    return new;
  end if;

  -- Desde cuándo puede ir cada uno. No es un turno reservado: es lo antes que
  -- podría, que es el criterio de comparación que reemplazó al precio.
  v_dias := case new.prestador_id
    when 'd0000000-0000-0000-0000-000000000001' then 1   -- Martín: mañana
    when 'd0000000-0000-0000-0000-000000000002' then 3   -- Lucía: en tres días
    when 'd0000000-0000-0000-0000-000000000003' then 2   -- Hernán: pasado
    when 'd0000000-0000-0000-0000-000000000004' then 6   -- Paula: la semana que viene
    else 4
  end;

  -- Si el pedido es urgente, el que atiende urgencias contesta "hoy". Es la
  -- forma de que el visitante vea para qué sirve el tilde de urgencia: sin
  -- esto, marcarlo no cambia nada visible y parece decorativo.
  select coalesce(disponible_urgencia, false) into v_urg_ok
    from prestador where id = new.prestador_id;
  if v_urgente and v_urg_ok then
    v_dias := 0;
  end if;

  new.estado           := 'aceptada';
  new.disponible_desde := current_date + v_dias;

  new.detalle := case new.prestador_id
    when 'd0000000-0000-0000-0000-000000000001'
      then 'Paso a verlo y coordinamos ahí mismo. Llevo mi equipo.'
    when 'd0000000-0000-0000-0000-000000000002'
      then 'Vamos con el equipo. Si querés, en la misma visita miramos el diseño del fondo.'
    when 'd0000000-0000-0000-0000-000000000003'
      then 'Paso a verlo y te digo. Trabajo en el barrio hace años.'
    when 'd0000000-0000-0000-0000-000000000004'
      then 'Esa semana tengo lugar. Si te interesa el riego, lo reviso en la misma visita.'
    else null
  end;

  -- Solo dos arriesgan un estimado, y la app ya lo muestra marcado como "a
  -- confirmar". Que no todos lo den es parte de lo que se compara.
  new.monto_presupuestado := case new.prestador_id
    when 'd0000000-0000-0000-0000-000000000001' then 98000
    when 'd0000000-0000-0000-0000-000000000002' then 125000
    else null
  end;

  return new;
end;
$$;

-- BEFORE INSERT y no AFTER: así se escribe una sola vez la fila, ya con la
-- respuesta puesta. Con AFTER habría que hacer un UPDATE sobre la fila recién
-- insertada, que dispara el trigger de updated_at y puede volverse recursivo.
drop trigger if exists trg_demo_responder on solicitud;
create trigger trg_demo_responder
  before insert on solicitud
  for each row execute function demo_responder_solicitud();


-- ════════════════════════════════════════════════════════════════════════
-- COMPROBAR
-- ════════════════════════════════════════════════════════════════════════
-- Después de pedir una visita desde /?demo=1 a los cinco jardineros, esto
-- debe mostrar cuatro 'aceptada' con fechas distintas y un 'pendiente'
-- (Ezequiel).
select pr.nombre, pr.apellido, s.estado, s.disponible_desde, s.monto_presupuestado, s.detalle
  from solicitud s
  join pedido p    on p.id = s.pedido_id
  join prestador pr on pr.id = s.prestador_id
 where p.barrio_id = 'dd000000-0000-0000-0000-000000000001'
 order by s.created_at desc, s.disponible_desde
 limit 20;


-- ════════════════════════════════════════════════════════════════════════
-- DESACTIVAR
-- ════════════════════════════════════════════════════════════════════════
-- Si en algún momento hay que apagarlo —por ejemplo para contestar a mano y
-- ver cómo se siente el circuito real— alcanza con borrar el trigger. La
-- función puede quedar: sin trigger no se ejecuta nunca.
--
--   drop trigger if exists trg_demo_responder on solicitud;
