-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Datos de ejemplo (seed)
-- ════════════════════════════════════════════════════════════════════════
-- Correr DESPUÉS de schema.sql. Carga un barrio con su administración,
-- propietarios, lotes, prestadores, verificaciones, trabajos y valoraciones,
-- para poder ver el directorio funcionando de inmediato.
--
-- Datos ficticios, alineados con los arquetipos de los documentos del proyecto.
-- Para borrar todo y recargar: truncate ... restart identity cascade (ver final).
-- ════════════════════════════════════════════════════════════════════════

-- ── Administración ──
insert into administracion (id, razon_social, cuit, contacto_nombre, contacto_rol, contacto_cel, contacto_email) values
  ('a0000000-0000-0000-0000-000000000001', 'Administración Parques del Lago S.A.', '30-71000000-1', 'Marcela Gómez', 'Gerente de Operaciones', '+54 9 11 5555-1000', 'operaciones@parquesdellago.com.ar');

-- ── Barrio ──
insert into barrio (id, administracion_id, nombre, localidad, partido, zona, cantidad_lotes, sistema_acceso) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Parques del Lago', 'Pilar', 'Pilar', 'GBA Norte', 420, 'Sistema de accesos con lectora de DNI');

-- ── Propietarios ──
insert into propietario (id, nombre, celular, email) values
  ('c0000000-0000-0000-0000-000000000001', 'Lucía Berardi',   '+54 9 11 4444-2001', 'lucia.berardi@example.com'),
  ('c0000000-0000-0000-0000-000000000002', 'Martín Aguirre',  '+54 9 11 4444-2002', 'martin.aguirre@example.com'),
  ('c0000000-0000-0000-0000-000000000003', 'Sofía Castro',    '+54 9 11 4444-2003', 'sofia.castro@example.com');

-- ── Lotes ──
insert into lote (id, barrio_id, numero, metros2, propietario_id) values
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'A-12', 620.00, 'c0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'B-04', 480.00, 'c0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'C-21', 350.00, 'c0000000-0000-0000-0000-000000000003');

-- ── Prestadores (jardineros) ──
insert into prestador (id, nombre, cuit_cuil, celular, domicilio, tipo_servicio_principal, horario_trabajo, zona_preferente, activo) values
  ('e0000000-0000-0000-0000-000000000001', 'Roberto Esquivel', '20-28333444-5', '+54 9 11 6666-3001', 'Del Viso, Pilar', 'jardineria', 'Lun-Vie 8-17', 'GBA Norte', true),
  ('e0000000-0000-0000-0000-000000000002', 'Jardines del Sur (Diego Pereyra)', '20-30111222-3', '+54 9 11 6666-3002', 'Garín, Escobar', 'jardineria', 'Lun-Sáb 7-15', 'GBA Norte', true),
  ('e0000000-0000-0000-0000-000000000003', 'Carlos Medina', '20-25999888-7', '+54 9 11 6666-3003', 'Tigre', 'jardineria', 'Mar-Sáb 9-18', 'GBA Norte', true);

-- Especialidades adicionales
insert into prestador_servicio (prestador_id, tipo) values
  ('e0000000-0000-0000-0000-000000000001', 'poda'),
  ('e0000000-0000-0000-0000-000000000002', 'poda'),
  ('e0000000-0000-0000-0000-000000000002', 'diseno_paisajismo'),
  ('e0000000-0000-0000-0000-000000000002', 'riego'),
  ('e0000000-0000-0000-0000-000000000003', 'fumigacion');

-- Habilitación por barrio
insert into prestador_barrio (prestador_id, barrio_id, habilitado) values
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', true),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', true),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', false);

-- ── Verificaciones (SOLO ESTADO) ──
insert into verificacion (prestador_id, barrio_id, tipo, estado, fecha_emision, fecha_vencimiento, validado_por, validado_en) values
  -- Roberto: completo y vigente
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'antecedentes_penales', 'verificado', '2026-01-15', '2027-01-15', 'a0000000-0000-0000-0000-000000000001', now()),
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'seguro_art',           'verificado', '2026-03-01', '2027-03-01', 'a0000000-0000-0000-0000-000000000001', now()),
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'identidad',            'verificado', '2026-01-15', null,         'a0000000-0000-0000-0000-000000000001', now()),
  -- Diego: identidad y antecedentes OK, seguro vencido
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'antecedentes_penales', 'verificado', '2025-11-10', '2026-11-10', 'a0000000-0000-0000-0000-000000000001', now()),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'seguro_art',           'vencido',    '2025-02-01', '2026-02-01', 'a0000000-0000-0000-0000-000000000001', now()),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'identidad',            'verificado', '2025-11-10', null,         'a0000000-0000-0000-0000-000000000001', now()),
  -- Carlos: pendiente
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'antecedentes_penales', 'pendiente',  null, null, null, null),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'identidad',            'pendiente',  null, null, null, null);

-- ── Trabajos (historial servicio del lote) ──
insert into trabajo (id, lote_id, propietario_id, prestador_id, barrio_id, fecha, tipo_servicio, monto, metodo_pago, estado) values
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-05-10', 'jardineria', 95000.00, 'transferencia', 'realizado'),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-06-10', 'jardineria', 95000.00, 'transferencia', 'realizado'),
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '2026-06-05', 'jardineria', 110000.00, 'efectivo', 'realizado'),
  ('f0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '2026-06-19', 'poda', 60000.00, 'mercadopago', 'realizado');

-- ── Valoraciones (de acá sale el puntaje del directorio) ──
insert into valoracion (trabajo_id, prestador_id, propietario_id, puntaje, comentario) values
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 5, 'Excelente, deja el jardín impecable y avisa siempre.'),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 5, 'Muy prolijo y puntual.'),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 4, 'Buen trabajo de poda, llegó un poco tarde.'),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 4, 'Cumplió con lo acordado.');

-- ────────────────────────────────────────────────────────────────────────
-- Para reiniciar los datos de ejemplo (¡borra todo!):
-- truncate administracion, barrio, propietario, lote, prestador,
--   prestador_servicio, prestador_barrio, verificacion, trabajo, valoracion,
--   ingreso restart identity cascade;
-- ────────────────────────────────────────────────────────────────────────
