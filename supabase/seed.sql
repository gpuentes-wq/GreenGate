-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Datos de ejemplo (seed) — Zona Norte del GBA
-- ════════════════════════════════════════════════════════════════════════
-- Correr DESPUÉS de schema.sql. Carga un ecosistema completo de ejemplo con
-- barrios reconocibles de la zona norte (Pilar, Escobar, Tigre).
-- Datos ficticios (administración, personas y montos) sobre barrios reales.
-- Es idempotente: el TRUNCATE de abajo limpia cualquier dato de ejemplo previo
-- antes de cargar, así se puede correr las veces que haga falta sin conflictos.
-- ════════════════════════════════════════════════════════════════════════

-- ── Limpieza: borra datos de ejemplo previos para recargar sin conflictos ──
truncate administracion, barrio, propietario, lote, prestador,
  prestador_servicio, prestador_barrio, prestador_foto, verificacion,
  trabajo, valoracion, ingreso restart identity cascade;

-- ── Administración (gestiona varios barrios de zona norte) ──
insert into administracion (id, razon_social, cuit, condicion_fiscal, domicilio, contacto_nombre, contacto_rol, contacto_cel, contacto_email, etapa_comercial, plan, fecha_alta_contrato) values
  ('a0000000-0000-0000-0000-000000000001', 'Administración Norte Gestión S.R.L.', '30-71456789-2', 'responsable_inscripto', 'Panamericana Ramal Pilar Km 50, Pilar', 'Marcela Gómez', 'Gerente de Operaciones', '+54 9 11 5555-1000', 'operaciones@nortegestion.com.ar', 'cliente', 'Piloto', '2026-04-01');

-- ── Barrios (zona norte del GBA) ──
insert into barrio (id, administracion_id, nombre, localidad, partido, provincia, zona, cantidad_lotes, sistema_acceso, requiere_antecedentes, requiere_seguro_art, requiere_identidad, etapa_activacion) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Ayres de Pilar', 'Pilar',   'Pilar',   'Buenos Aires', 'GBA Norte', 900,  'Lectora de DNI en garita',     true, true,  true, 'activo'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'El Cantón',      'Escobar', 'Escobar', 'Buenos Aires', 'GBA Norte', 1200, 'Tótem con lectura de QR',      true, false, true, 'activo'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Santa Bárbara',  'Tigre',   'Tigre',   'Buenos Aires', 'GBA Norte', 700,  'Control de acceso con tarjeta', true, true,  true, 'piloto');

-- ── Propietarios ──
insert into propietario (id, nombre, apellido, celular, email, metodo_pago_preferido) values
  ('c0000000-0000-0000-0000-000000000001', 'Lucía',  'Berardi', '+54 9 11 4444-2001', 'lucia.berardi@example.com',  'transferencia'),
  ('c0000000-0000-0000-0000-000000000002', 'Martín', 'Aguirre', '+54 9 11 4444-2002', 'martin.aguirre@example.com', 'efectivo'),
  ('c0000000-0000-0000-0000-000000000003', 'Sofía',  'Castro',  '+54 9 11 4444-2003', 'sofia.castro@example.com',   'mercadopago');

-- ── Lotes ── (Lucía tiene lote en Ayres de Pilar y en Santa Bárbara → propietario multi-barrio)
insert into lote (id, barrio_id, numero, metros2, metros2_jardin, tipo_uso, propietario_id) values
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'A-12', 620.00, 380.00, 'residencia_principal', 'c0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'B-04', 480.00, 300.00, 'residencia_principal', 'c0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'C-21', 350.00, 210.00, 'residencia_principal', 'c0000000-0000-0000-0000-000000000003'),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 'L-07', 540.00, 360.00, 'fin_de_semana',        'c0000000-0000-0000-0000-000000000001');

-- ── Prestadores ── (rango de condición fiscal; e2 es empresa)
insert into prestador (id, nombre, apellido, razon_social, es_empresa, cuit_cuil, condicion_fiscal, celular, domicilio, tipo_servicio_principal, horario_trabajo, zona_preferente, descripcion, anios_experiencia, cantidad_ayudantes, tarifa_referencia, cbu_alias, activo) values
  ('e0000000-0000-0000-0000-000000000001', 'Roberto', 'Esquivel', null, false, '20-28333444-5', 'monotributo', '+54 9 11 6666-3001', 'Del Viso, Pilar', 'jardineria', 'Lun-Vie 8-17', 'GBA Norte', 'Jardinería integral, poda y mantenimiento. 12 años trabajando en barrios de Pilar.', 12, 1, 95000.00, 'roberto.esquivel.mp', true),
  ('e0000000-0000-0000-0000-000000000002', 'Diego', 'Pereyra', 'Jardines del Norte', true, '30-30111222-3', 'responsable_inscripto', '+54 9 11 6666-3002', 'Garín, Escobar', 'jardineria', 'Lun-Sáb 7-15', 'GBA Norte', 'Diseño y paisajismo, riego y poda. Equipo de 3 personas.', 8, 3, 110000.00, 'jardinesdelnorte', true),
  ('e0000000-0000-0000-0000-000000000003', 'Carlos', 'Medina', null, false, '20-25999888-7', 'informal', '+54 9 11 6666-3003', 'Tigre', 'jardineria', 'Mar-Sáb 9-18', 'GBA Norte', 'Corte de pasto y fumigación.', 5, 0, 70000.00, null, true);

-- Especialidades adicionales (con tarifa de referencia)
insert into prestador_servicio (prestador_id, tipo, tarifa) values
  ('e0000000-0000-0000-0000-000000000001', 'poda', 40000.00),
  ('e0000000-0000-0000-0000-000000000002', 'poda', 45000.00),
  ('e0000000-0000-0000-0000-000000000002', 'diseno_paisajismo', 150000.00),
  ('e0000000-0000-0000-0000-000000000002', 'riego', 80000.00),
  ('e0000000-0000-0000-0000-000000000003', 'fumigacion', 35000.00);

-- Habilitación por barrio (cada prestador en su barrio de trabajo)
insert into prestador_barrio (prestador_id, barrio_id, habilitado, fecha_habilitacion, fecha_vencimiento_habilitacion) values
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', true,  '2026-02-01', '2027-02-01'),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', true,  '2026-03-15', '2027-03-15'),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', false, null, null);

-- Portfolio de fotos (trabajos anteriores)
insert into prestador_foto (prestador_id, url, descripcion, orden) values
  ('e0000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/greengate1/600/400', 'Jardín del lote A-12 mantenido', 1),
  ('e0000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/greengate2/600/400', 'Poda de arbustos', 2),
  ('e0000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/greengate3/600/400', 'Diseño de cantero con riego', 1);

-- ── Verificaciones (SOLO ESTADO; cada prestador en su barrio) ──
insert into verificacion (prestador_id, barrio_id, tipo, estado, fecha_emision, fecha_vencimiento, aseguradora, nro_poliza, validado_por, validado_en) values
  -- Roberto (Ayres de Pilar): completo y vigente
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'antecedentes_penales', 'verificado', '2026-01-15', '2027-01-15', null, null, 'a0000000-0000-0000-0000-000000000001', '2026-01-20'),
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'seguro_art',           'verificado', '2026-03-01', '2027-03-01', 'La Segunda ART', 'ART-998877', 'a0000000-0000-0000-0000-000000000001', '2026-03-05'),
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'identidad',            'verificado', '2026-01-15', null,         null, null, 'a0000000-0000-0000-0000-000000000001', '2026-01-20'),
  -- Diego (El Cantón): antecedentes e identidad OK, seguro vencido
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'antecedentes_penales', 'verificado', '2025-11-10', '2026-11-10', null, null, 'a0000000-0000-0000-0000-000000000001', '2025-11-15'),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'seguro_art',           'verificado', '2025-02-01', '2026-02-01', 'Provincia ART', 'ART-112233', 'a0000000-0000-0000-0000-000000000001', '2025-02-10'),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'identidad',            'verificado', '2025-11-10', null,         null, null, 'a0000000-0000-0000-0000-000000000001', '2025-11-15'),
  -- Carlos (Santa Bárbara): pendiente
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'antecedentes_penales', 'pendiente',  null, null, null, null, null, null),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'identidad',            'pendiente',  null, null, null, null, null, null);

-- ── Trabajos (con frecuencia, estado de pago y comisión 12%) ──
insert into trabajo (id, lote_id, propietario_id, prestador_id, barrio_id, fecha, tipo_servicio, descripcion, monto, comision_plataforma, metodo_pago, estado_pago, fecha_pago, frecuencia, estado) values
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-05-10', 'jardineria', 'Corte y mantenimiento general', 95000.00, 11400.00, 'transferencia', 'pagado', '2026-05-10', 'semanal', 'realizado'),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-06-10', 'jardineria', 'Corte y mantenimiento general', 95000.00, 11400.00, 'transferencia', 'pagado', '2026-06-10', 'semanal', 'realizado'),
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '2026-06-05', 'jardineria', 'Mantenimiento quincenal', 110000.00, 13200.00, 'efectivo', 'pagado', '2026-06-05', 'quincenal', 'realizado'),
  ('f0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '2026-06-19', 'poda', 'Poda de arbustos y limpieza', 60000.00, 7200.00, 'mercadopago', 'pendiente', null, 'unico', 'realizado');

-- ── Valoraciones (con puntaje por dimensión y verificada) ──
insert into valoracion (trabajo_id, prestador_id, propietario_id, puntaje, puntaje_calidad, puntaje_puntualidad, puntaje_comunicacion, puntaje_precio, comentario, verificada) values
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 5, 5, 5, 5, 4, 'Excelente, deja el jardín impecable y avisa siempre.', true),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 5, 5, 5, 4, 5, 'Muy prolijo y puntual.', true),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 4, 4, 3, 4, 4, 'Buen trabajo, llegó un poco tarde.', true),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 4, 5, 4, 4, 3, 'Cumplió con lo acordado.', true);

-- ────────────────────────────────────────────────────────────────────────
-- Para reiniciar los datos de ejemplo (¡borra todo!):
-- truncate administracion, barrio, propietario, lote, prestador,
--   prestador_servicio, prestador_barrio, prestador_foto, verificacion,
--   trabajo, valoracion, ingreso restart identity cascade;
-- ────────────────────────────────────────────────────────────────────────
