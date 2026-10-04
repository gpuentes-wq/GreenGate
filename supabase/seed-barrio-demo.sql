-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Barrio de demostración (acceso abierto desde la landing)
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente: los ids son
-- fijos y todo usa `on conflict do nothing`, así que se puede correr dos
-- veces sin duplicar nada.
--
-- Por qué existe. Al abrir la app a cualquiera que tenga el link, el visitante
-- escribe en la base de verdad: crea pedidos, manda solicitudes y deja reseñas.
-- Sobre los barrios del piloto eso rompe tres cosas:
--
--   1. El botón de WhatsApp le escribe a un jardinero real. Un curioso
--      probando la app le pide a Roberto Esquivel que vaya a podar.
--   2. Las reseñas de prueba promedian con las reales y ensucian el puntaje
--      del directorio, que es el activo que vuelve creíble a la plataforma.
--   3. Los pedidos de prueba llenan el panel del jardinero del piloto.
--
-- Con un barrio aislado, todo lo que hace el visitante queda contenido ahí.
-- Los barrios del piloto no se tocan y no hay que limpiar la base cada semana.
--
-- ⚠️ Los celulares son FICTICIOS a propósito (prefijo 11 5555-00xx). Si alguien
--    toca "Contactar por WhatsApp", el mensaje no le llega a ninguna persona.
--    NO reemplazar por números reales.
--
-- Ver docs/estrategia-piloto.md.
-- ════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════
-- PARTE 1 · La administración y el barrio
-- ════════════════════════════════════════════════════════════════════════
insert into administracion (id, razon_social, contacto_nombre, contacto_rol, etapa_comercial)
values ('da000000-0000-0000-0000-000000000001', 'Administración Demo GreenGate',
        'Equipo GreenGate', 'Demostración', 'prospecto')
on conflict (id) do nothing;

-- El nombre empieza con "▶" para que ordene primero en cualquier listado
-- alfabético y para que se distinga de un barrio real de un vistazo.
insert into barrio (id, administracion_id, nombre, localidad, partido, provincia, zona,
                    cantidad_lotes, etapa_activacion)
values ('dd000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001',
        '▶ Barrio Demo GreenGate', 'Demo', 'Demo', 'Buenos Aires', 'GBA Norte', 240, 'piloto')
on conflict (id) do nothing;


-- ════════════════════════════════════════════════════════════════════════
-- PARTE 2 · Cinco jardineros ficticios
-- ════════════════════════════════════════════════════════════════════════
-- Cinco y no tres: el valor de la pantalla es comparar, y con dos o tres la
-- selección múltiple no se luce. Se eligen perfiles deliberadamente distintos
-- —uno con equipo, uno informal, uno sin reseñas— para que el visitante vea
-- que el directorio distingue y no es una lista pareja.
insert into prestador (id, nombre, apellido, razon_social, es_empresa, condicion_fiscal,
                       celular, documento, tipo_servicio_principal, horario_trabajo,
                       zona_preferente, descripcion, anios_experiencia, cantidad_ayudantes,
                       tarifa_referencia, disponible_urgencia, origen, activo)
values
  ('d0000000-0000-0000-0000-000000000001', 'Martín', 'Sosa', null, false, 'monotributo',
   '+54 9 11 5555-0001', '28111222', 'jardineria', 'Lun-Vie 8-17', 'GBA Norte',
   'Mantenimiento mensual y poda. Trabajo solo, con equipo propio.', 11, 0,
   98000.00, true, 'autoregistro', true),

  ('d0000000-0000-0000-0000-000000000002', 'Lucía', 'Ferreyra', 'Verde Sur', true, 'responsable_inscripto',
   '+54 9 11 5555-0002', '30222333', 'jardineria', 'Lun-Sáb 7-16', 'GBA Norte',
   'Diseño de jardines y mantenimiento integral. Equipo de 3 personas.', 9, 2,
   125000.00, true, 'autoregistro', true),

  ('d0000000-0000-0000-0000-000000000003', 'Hernán', 'Quiroga', null, false, 'informal',
   '+54 9 11 5555-0003', '31333444', 'jardineria', 'Mar-Sáb 9-18', 'GBA Norte',
   'Corte de pasto y limpieza de jardín.', 4, 0,
   72000.00, false, 'autoregistro', true),

  ('d0000000-0000-0000-0000-000000000004', 'Paula', 'Benítez', null, false, 'monotributo',
   '+54 9 11 5555-0004', '29444555', 'jardineria', 'Lun-Vie 8-16', 'GBA Norte',
   'Paisajismo y riego automatizado. Especialidad en jardines de bajo consumo de agua.', 7, 1,
   115000.00, false, 'autoregistro', true),

  ('d0000000-0000-0000-0000-000000000005', 'Ezequiel', 'Morán', null, false, 'monotributo',
   '+54 9 11 5555-0005', '32555666', 'jardineria', 'Lun-Vie 9-17', 'GBA Norte',
   'Recién sumado al barrio. Mantenimiento general y poda de altura.', 3, 0,
   85000.00, false, 'autoregistro', true)
on conflict (id) do nothing;

-- Todos habilitados: el visitante tiene que ver un directorio poblado. Si
-- alguno quedara sin habilitar, no aparecería y la demo se vería vacía.
insert into prestador_barrio (prestador_id, barrio_id, habilitado, fecha_habilitacion)
select id, 'dd000000-0000-0000-0000-000000000001', true, current_date - 90
  from prestador where id in ('d0000000-0000-0000-0000-000000000001',
         'd0000000-0000-0000-0000-000000000002',
         'd0000000-0000-0000-0000-000000000003',
         'd0000000-0000-0000-0000-000000000004',
         'd0000000-0000-0000-0000-000000000005')
on conflict (prestador_id, barrio_id) do nothing;

-- Servicios adicionales, para que las fichas no se vean todas iguales.
insert into prestador_servicio (prestador_id, tipo, tarifa) values
  ('d0000000-0000-0000-0000-000000000001', 'poda', null),
  ('d0000000-0000-0000-0000-000000000002', 'diseno_paisajismo', null),
  ('d0000000-0000-0000-0000-000000000002', 'riego', null),
  ('d0000000-0000-0000-0000-000000000002', 'poda', null),
  ('d0000000-0000-0000-0000-000000000003', 'limpieza_exterior', null),
  ('d0000000-0000-0000-0000-000000000004', 'riego', null),
  ('d0000000-0000-0000-0000-000000000004', 'diseno_paisajismo', null),
  ('d0000000-0000-0000-0000-000000000005', 'poda', null)
on conflict (prestador_id, tipo) do nothing;


-- ════════════════════════════════════════════════════════════════════════
-- PARTE 3 · Documentación en estados variados
-- ════════════════════════════════════════════════════════════════════════
-- Es lo que le da sentido al filtro "Solo verificados": si todos estuvieran
-- al día, el filtro no cambiaría nada y el visitante no entendería para qué
-- está. Dos completos, uno al que le falta el seguro, uno con antecedentes
-- vencidos y uno pendiente de validación.
insert into verificacion (id, prestador_id, tipo, estado, fecha_emision, fecha_vencimiento) values
  -- Martín: completo
  ('df000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000001', 'antecedentes_penales', 'verificado', current_date - 120, current_date + 240),
  ('df000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000001', 'seguro_art',           'verificado', current_date - 60,  current_date + 300),
  ('df000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000001', 'identidad',            'verificado', current_date - 120, null),
  -- Lucía: completo
  ('df000000-0000-0000-0000-000000000021', 'd0000000-0000-0000-0000-000000000002', 'antecedentes_penales', 'verificado', current_date - 90,  current_date + 270),
  ('df000000-0000-0000-0000-000000000022', 'd0000000-0000-0000-0000-000000000002', 'seguro_art',           'verificado', current_date - 30,  current_date + 330),
  ('df000000-0000-0000-0000-000000000023', 'd0000000-0000-0000-0000-000000000002', 'identidad',            'verificado', current_date - 90,  null),
  -- Hernán: trabaja hace años pero no presentó el seguro
  ('df000000-0000-0000-0000-000000000031', 'd0000000-0000-0000-0000-000000000003', 'antecedentes_penales', 'verificado', current_date - 150, current_date + 200),
  ('df000000-0000-0000-0000-000000000032', 'd0000000-0000-0000-0000-000000000003', 'seguro_art',           'pendiente',  null, null),
  ('df000000-0000-0000-0000-000000000033', 'd0000000-0000-0000-0000-000000000003', 'identidad',            'verificado', current_date - 150, null),
  -- Paula: antecedentes vencidos (dispara la alerta del panel de administración)
  ('df000000-0000-0000-0000-000000000041', 'd0000000-0000-0000-0000-000000000004', 'antecedentes_penales', 'vencido',    current_date - 400, current_date - 35),
  ('df000000-0000-0000-0000-000000000042', 'd0000000-0000-0000-0000-000000000004', 'seguro_art',           'verificado', current_date - 45,  current_date + 320),
  ('df000000-0000-0000-0000-000000000043', 'd0000000-0000-0000-0000-000000000004', 'identidad',            'verificado', current_date - 400, null),
  -- Ezequiel: recién llegado, todo pendiente
  ('df000000-0000-0000-0000-000000000051', 'd0000000-0000-0000-0000-000000000005', 'antecedentes_penales', 'pendiente', null, null),
  ('df000000-0000-0000-0000-000000000052', 'd0000000-0000-0000-0000-000000000005', 'seguro_art',           'pendiente', null, null),
  ('df000000-0000-0000-0000-000000000053', 'd0000000-0000-0000-0000-000000000005', 'identidad',            'pendiente', null, null)
on conflict (id) do nothing;


-- ════════════════════════════════════════════════════════════════════════
-- PARTE 4 · Reseñas de arranque
-- ════════════════════════════════════════════════════════════════════════
-- Sin reseñas, los cinco aparecen como "Sin reseñas aún" y la pantalla que el
-- visitante ve primero pierde todo su sentido: no hay nada que comparar.
--
-- `solicitud_id` va nulo a propósito: estas no cuelgan de un trabajo real, son
-- el estado inicial del barrio. Las que deje el visitante sí van a tener
-- solicitud, que es como se distinguen después.
--
-- Ezequiel queda sin reseñas a propósito: muestra cómo se ve un jardinero
-- nuevo, que es información útil y no un defecto.
insert into valoracion (id, prestador_id, puntaje, comentario, respuesta_prestador, verificada) values
  ('d9000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 5,
   'Viene todas las semanas sin que haya que recordárselo. El jardín nunca estuvo mejor.', null, true),
  ('d9000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 4,
   'Muy prolijo. Una vez se atrasó por lluvia pero avisó con tiempo.', '¡Gracias! Cuando llueve reprogramo para no dañar el césped.', true),
  ('d9000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 5,
   'Rediseñaron el fondo de casa y quedó impecable. Vinieron tres personas y terminaron en un día.', null, true),
  ('d9000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 4,
   'Buen trabajo y muy puntuales. El presupuesto fue el que habían pasado.', null, true),
  ('d9000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000003', 4,
   'Cumplidor y buen precio. Corta el pasto y deja todo limpio.', null, true),
  ('d9000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000003', 3,
   'Hace bien lo básico. Para una poda grande le pedí a otro.', null, true),
  ('d9000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000004', 5,
   'Nos cambió el riego y bajamos muchísimo el consumo de agua. Sabe mucho del tema.', null, true)
on conflict (id) do nothing;


-- ════════════════════════════════════════════════════════════════════════
-- PARTE 5 · Comprobar que la demo se ve bien
-- ════════════════════════════════════════════════════════════════════════
-- Lo que el visitante encuentra al entrar. Esperado: 5 habilitados, 2 con
-- urgencia, 5 con DNI.
select b.nombre as barrio,
       count(*) filter (where pb.habilitado)             as habilitados,
       count(*) filter (where p.disponible_urgencia)     as con_urgencia,
       count(*) filter (where p.documento is not null)   as con_dni
  from barrio b
  join prestador_barrio pb on pb.barrio_id = b.id
  join prestador p on p.id = pb.prestador_id
 where b.id = 'dd000000-0000-0000-0000-000000000001'
 group by b.nombre;

-- Puntajes del directorio. Ezequiel debe aparecer sin reseñas.
select p.nombre, p.apellido,
       round(avg(v.puntaje), 2) as puntaje,
       count(v.id)              as resenas
  from prestador p
  left join valoracion v on v.prestador_id = p.id
 where p.id in ('d0000000-0000-0000-0000-000000000001',
         'd0000000-0000-0000-0000-000000000002',
         'd0000000-0000-0000-0000-000000000003',
         'd0000000-0000-0000-0000-000000000004',
         'd0000000-0000-0000-0000-000000000005')
 group by p.id, p.nombre, p.apellido
 order by puntaje desc nulls last;

-- El id del barrio, que es el que hay que poner en el link de la landing.
select id as barrio_demo_id, nombre from barrio
 where id = 'dd000000-0000-0000-0000-000000000001';


-- ════════════════════════════════════════════════════════════════════════
-- MANTENIMIENTO · Borrar lo que dejaron los visitantes
-- ════════════════════════════════════════════════════════════════════════
-- No hace falta correrlo seguido —para eso está aislado— pero si el barrio
-- demo se llena de pedidos de prueba, esto lo deja como recién sembrado.
-- Solo toca el barrio demo: los barrios del piloto no se ven afectados.
--
--   delete from valoracion
--    where solicitud_id is not null
----      and prestador_id in (los cinco ids de arriba);
--
--   delete from solicitud
--    where pedido_id in (select id from pedido
--                         where barrio_id = 'dd000000-0000-0000-0000-000000000001');
--
--   delete from pedido where barrio_id = 'dd000000-0000-0000-0000-000000000001';
--
--   delete from prestador_sugerido
--    where barrio_id = 'dd000000-0000-0000-0000-000000000001';
