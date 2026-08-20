-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: DOCUMENTO (DNI) en prestador
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente. Aditiva: la
-- app desplegada sigue funcionando aunque todavía no tenga el código nuevo.
--
-- El alta del jardinero pedía el domicilio, un dato que no consume ninguna
-- pantalla ni ningún flujo. En su lugar pide el DNI, que sí tiene uso: es
-- contra ese número que la administración valida la verificación de
-- identidad, uno de los tres papeles del proceso.
--
-- Se llama `documento` (no `dni`) para hablar el mismo idioma que
-- integrante.documento, que ya guarda lo mismo para cada persona de un
-- prestador-equipo.
--
-- Si el prestador es una empresa, este documento es el del CONTACTO — la
-- misma persona cuyo nombre pide el formulario. Los documentos del resto del
-- equipo viven en integrante, uno por persona.
--
-- prestador.domicilio queda en la tabla pero deja de escribirse: los datos
-- ya cargados se conservan y ninguna pantalla los pide. No se elimina porque
-- borrar una columna es irreversible.
--
-- Nota legal: el DNI es dato personal bajo la Ley 25.326, igual que el CUIT
-- que ya se guardaba. Sigue valiendo la regla del proyecto — se guarda el
-- número para poder validar, nunca una imagen del documento.
-- ════════════════════════════════════════════════════════════════════════

alter table prestador add column if not exists documento text;

-- Comprobación
select column_name, data_type
  from information_schema.columns
 where table_name = 'prestador'
   and column_name = 'documento';
