-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Corrección de encoding en datos de seed.sql
-- ════════════════════════════════════════════════════════════════════════
-- Al cargar seed.sql por primera vez, el texto con acentos quedó mal
-- codificado en la base (doble codificación UTF-8: "Cantón" guardado como
-- "CantÃ³n"). El archivo seed.sql en sí está bien — el problema pasó al
-- pegar el contenido en el editor SQL. Este script corrige puntualmente
-- cada fila ya identificada por su id, sin borrar ni resetear nada (no
-- toca los datos que se cargaron después, como pruebas hechas desde la app).
-- Correr una sola vez en el SQL Editor de Supabase.
-- ════════════════════════════════════════════════════════════════════════

update administracion set razon_social = 'Administración Norte Gestión S.R.L.', contacto_nombre = 'Marcela Gómez'
  where id = 'a0000000-0000-0000-0000-000000000001';

update barrio set nombre = 'El Cantón', sistema_acceso = 'Tótem con lectura de QR'
  where id = 'b0000000-0000-0000-0000-000000000002';
update barrio set nombre = 'Santa Bárbara'
  where id = 'b0000000-0000-0000-0000-000000000003';

update propietario set nombre = 'Lucía'  where id = 'c0000000-0000-0000-0000-000000000001';
update propietario set nombre = 'Martín' where id = 'c0000000-0000-0000-0000-000000000002';
update propietario set nombre = 'Sofía'  where id = 'c0000000-0000-0000-0000-000000000003';

update prestador set descripcion = 'Jardinería integral, poda y mantenimiento. 12 años trabajando en barrios de Pilar.'
  where id = 'e0000000-0000-0000-0000-000000000001';
update prestador set horario_trabajo = 'Lun-Sáb 7-15', descripcion = 'Diseño y paisajismo, riego y poda. Equipo de 3 personas.'
  where id = 'e0000000-0000-0000-0000-000000000002';
update prestador set horario_trabajo = 'Mar-Sáb 9-18', descripcion = 'Corte de pasto y fumigación.'
  where id = 'e0000000-0000-0000-0000-000000000003';

update integrante set nombre = 'Martín' where id = 'f1000000-0000-0000-0000-000000000002';

update prestador_foto set descripcion = 'Jardín del lote A-12 mantenido'
  where prestador_id = 'e0000000-0000-0000-0000-000000000001' and orden = 1;
update prestador_foto set descripcion = 'Diseño de cantero con riego'
  where prestador_id = 'e0000000-0000-0000-0000-000000000002' and orden = 1;

update valoracion set comentario = 'Excelente, deja el jardín impecable y avisa siempre.'
  where trabajo_id = 'f0000000-0000-0000-0000-000000000001';
update valoracion set comentario = 'Buen trabajo, llegó un poco tarde.'
  where trabajo_id = 'f0000000-0000-0000-0000-000000000003';
update valoracion set comentario = 'Cumplió con lo acordado.'
  where trabajo_id = 'f0000000-0000-0000-0000-000000000004';
