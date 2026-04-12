// ===== CLOUDINARY CLIENT - PARAÍSO ASTRAL =====
// Upload de imágenes a Cloudinary usando un preset UNSIGNED.
// REQUIERE: que en tu cuenta de Cloudinary exista un upload preset "unsigned"
// con el nombre configurado en CLOUDINARY_UPLOAD_PRESET (por defecto "paraiso_astral").
//
// Cómo crearlo una vez:
//   Cloudinary Console → Settings → Upload → Upload presets →
//   "Add upload preset" → signing mode: "Unsigned" → nombre: paraiso_astral →
//   folder (opcional): paraiso-astral → Save.
//
// El cloud_name sale de tu CLOUDINARY_URL (en .env) o podés hardcodearlo abajo.

(function () {
  'use strict';

  // Valores leídos del entorno si están disponibles; si no, defaults del proyecto.
  var ENV = typeof window !== 'undefined' ? (window.__ENV__ || {}) : {};
  var CLOUD_NAME = ENV.VITE_CLOUDINARY_CLOUD_NAME || 'dbihuauip';
  var UPLOAD_PRESET = ENV.VITE_CLOUDINARY_UPLOAD_PRESET || 'paraiso_astral';

  function ok(data) { return { status: 'success', data: data }; }
  function fail(message) { return { status: 'error', data: null, message: message || 'Error' }; }

  var CloudinaryClient = {
    cloudName: CLOUD_NAME,
    uploadPreset: UPLOAD_PRESET,

    /**
     * Sube una imagen a Cloudinary y devuelve la URL segura.
     * @param {File} file - Archivo de imagen
     * @param {string} folder - Carpeta opcional en Cloudinary
     */
    upload: async function (file, folder) {
      if (!file) return fail('No se proporcionó archivo');
      if (!CLOUD_NAME) return fail('Cloudinary cloud_name no configurado');
      if (!UPLOAD_PRESET) return fail('Cloudinary upload preset no configurado');

      var fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      if (folder) fd.append('folder', folder);

      var url = 'https://api.cloudinary.com/v1_1/' + CLOUD_NAME + '/image/upload';
      try {
        var res = await fetch(url, { method: 'POST', body: fd });
        if (!res.ok) {
          var errText = await res.text();
          return fail('Cloudinary error ' + res.status + ': ' + errText);
        }
        var json = await res.json();
        return ok({
          url: json.secure_url,
          publicId: json.public_id,
          width: json.width,
          height: json.height,
          format: json.format
        });
      } catch (err) {
        return fail(err && err.message);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.CloudinaryClient = CloudinaryClient;
  }
})();
