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

  var CLOUD_NAME = 'dkwuebrur';
  var UPLOAD_PRESET = 'paraiso_astral';

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
      console.log('[Cloudinary] upload() llamado', {
        cloud_name: CLOUD_NAME,
        upload_preset: UPLOAD_PRESET,
        folder: folder || '(ninguna)',
        file: file ? { name: file.name, size: file.size, type: file.type } : null
      });

      if (!file) return fail('No se proporcionó archivo');
      if (!CLOUD_NAME) return fail('Cloudinary cloud_name no configurado');
      if (!UPLOAD_PRESET) return fail('Cloudinary upload preset no configurado');

      var fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      if (folder) fd.append('folder', folder);
// AGREGAR ESTA LÍNEA para ver qué se envía:
console.log('[Cloudinary] FormData contents:', {
  file_name: file.name,
  file_size: file.size,
  file_type: file.type,
  upload_preset: UPLOAD_PRESET,
  folder: folder
});
      var url = 'https://api.cloudinary.com/v1_1/' + CLOUD_NAME + '/image/upload';
      console.log('[Cloudinary] POST', url);

      try {
        var res = await fetch(url, { method: 'POST', body: fd });
        console.log('[Cloudinary] respuesta HTTP', res.status, res.statusText);

        if (!res.ok) {
          var errText = await res.text();
          console.error('[Cloudinary] error body:', errText);
          try {
            var errJson = JSON.parse(errText);
            console.error('[Cloudinary] error detallado:', errJson);
          } catch (_) {}
          return fail('Cloudinary error ' + res.status + ': ' + errText);
        }

        var json = await res.json();
        console.log('[Cloudinary] upload exitoso:', { secure_url: json.secure_url, public_id: json.public_id });
        return ok({
          url: json.secure_url,
          publicId: json.public_id,
          width: json.width,
          height: json.height,
          format: json.format
        });
      } catch (err) {
        console.error('[Cloudinary] excepción en fetch:', err);
        return fail(err && err.message);
      }
    }
  };

    /**
     * Sube un archivo de audio a Cloudinary y devuelve la URL segura.
     *
     * IMPORTANTE: el upload_preset "paraiso_astral" en Cloudinary Console debe
     * tener "Resource type" configurado como "Auto" o "Video" para aceptar audio.
     * (Settings → Upload → Upload presets → paraiso_astral → Resource type: Auto)
     *
     * Cloudinary usa el endpoint /video/upload para audio también.
     *
     * @param {File} file - Archivo de audio (MP3, WAV, etc.)
     * @param {string} folder - Carpeta opcional en Cloudinary
     */
    uploadAudio: async function (file, folder) {
      console.log('[Cloudinary] uploadAudio() llamado', {
        cloud_name: CLOUD_NAME,
        upload_preset: UPLOAD_PRESET,
        folder: folder || '(ninguna)',
        file: file ? { name: file.name, size: file.size, type: file.type } : null
      });

      if (!file) return fail('No se proporcionó archivo');
      if (!CLOUD_NAME) return fail('Cloudinary cloud_name no configurado');
      if (!UPLOAD_PRESET) return fail('Cloudinary upload preset no configurado');

      var fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      fd.append('resource_type', 'video');
      if (folder) fd.append('folder', folder);

      var url = 'https://api.cloudinary.com/v1_1/' + CLOUD_NAME + '/video/upload';
      console.log('[Cloudinary] POST', url);

      try {
        var res = await fetch(url, { method: 'POST', body: fd });
        console.log('[Cloudinary] respuesta HTTP', res.status, res.statusText);

        if (!res.ok) {
          var errText = await res.text();
          console.error('[Cloudinary] error body:', errText);
          try {
            var errJson = JSON.parse(errText);
            console.error('[Cloudinary] error detallado:', errJson);
          } catch (_) {}
          return fail('Cloudinary error ' + res.status + ': ' + errText);
        }

        var json = await res.json();
        console.log('[Cloudinary] uploadAudio exitoso:', { secure_url: json.secure_url, public_id: json.public_id });
        return ok({
          url: json.secure_url,
          publicId: json.public_id,
          format: json.format,
          duration: json.duration
        });
      } catch (err) {
        console.error('[Cloudinary] excepción en fetch (audio):', err);
        return fail(err && err.message);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.CloudinaryClient = CloudinaryClient;
  }
})();
