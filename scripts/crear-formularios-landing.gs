/**
 * Crea los 3 formularios de interés del landing de GreenGate (Administración,
 * Propietario, Jardinero) directamente en tu Google Drive.
 *
 * Cómo usarlo:
 * 1. Andá a https://script.google.com/ con la cuenta de Google que quieras
 *    usar para GreenGate.
 * 2. "Nuevo proyecto".
 * 3. Borrá el código de ejemplo y pegá todo este archivo.
 * 4. Arriba, elegí la función "crearFormularios" en el selector y apretá
 *    Ejecutar (▶). La primera vez va a pedir autorización — es tu propia
 *    cuenta dándole permiso a este script tuyo para crear formularios en tu
 *    Drive, aceptá.
 * 5. Cuando termine, abrí "Ejecuciones" (ícono de reloj, panel izquierdo) →
 *    entrá a la ejecución → ahí van a estar los 3 links publicados.
 * 6. Los 3 formularios ya quedan armados en tu Drive — podés retocar el
 *    diseño ahí mismo si querés. Pasame los 3 links para conectarlos a los
 *    botones del landing.
 */

function crearFormularios() {
  crearFormularioAdministracion();
  crearFormularioPropietario();
  crearFormularioJardinero();
}

function crearFormularioAdministracion() {
  var form = FormApp.create('GreenGate — Interés Administración')
    .setDescription('Dejanos tus datos y coordinamos una demo para tu barrio.')
    .setCollectEmail(false)
    .setConfirmationMessage('¡Gracias! Te contactamos a la brevedad.');

  form.addTextItem().setTitle('Nombre y apellido').setRequired(true);
  form.addTextItem().setTitle('Cargo').setRequired(true);
  form.addTextItem().setTitle('Barrio que administra').setRequired(true);
  form.addTextItem().setTitle('Cantidad de lotes (aprox.)');
  form.addTextItem().setTitle('Teléfono').setRequired(true);
  form.addTextItem().setTitle('Email');

  Logger.log('ADMINISTRACIÓN → ' + form.getPublishedUrl());
}

function crearFormularioPropietario() {
  var form = FormApp.create('GreenGate — Interés Propietario')
    .setDescription('Contanos qué te interesa de GreenGate y te contactamos.')
    .setCollectEmail(false)
    .setConfirmationMessage('¡Gracias! Te contactamos a la brevedad.');

  form.addTextItem().setTitle('Nombre y apellido').setRequired(true);
  form.addTextItem().setTitle('Barrio donde vivís').setRequired(true);
  form.addTextItem().setTitle('Teléfono o email de contacto').setRequired(true);
  form.addParagraphTextItem().setTitle('¿Qué te interesa?');

  Logger.log('PROPIETARIO → ' + form.getPublishedUrl());
}

function crearFormularioJardinero() {
  var form = FormApp.create('GreenGate — Interés Jardinero')
    .setDescription('Sumate como jardinero a GreenGate.')
    .setCollectEmail(false)
    .setConfirmationMessage('¡Gracias! Te contactamos a la brevedad.');

  form.addTextItem().setTitle('Nombre y apellido').setRequired(true);
  form.addTextItem().setTitle('Barrios donde trabajás').setRequired(true);
  form.addTextItem().setTitle('Teléfono').setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle('¿Trabajás solo o en equipo?')
    .setChoiceValues(['Solo', 'En equipo']);

  Logger.log('JARDINERO → ' + form.getPublishedUrl());
}
