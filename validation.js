(function () {
  var form = document.getElementById("applicationForm");

  if (!form) {
    return;
  }

  var volumenWarning = document.getElementById("volumen_warning");
  var serviciosError = document.getElementById("servicios_error");
  var plActualError = document.getElementById("pl_actual_error");
  var successBox = document.getElementById("form_success");

  var fields = {
    nombre_empresa: document.getElementById("nombre_empresa"),
    persona_contacto: document.getElementById("persona_contacto"),
    email: document.getElementById("email"),
    telefono: document.getElementById("telefono"),
    sitio_web: document.getElementById("sitio_web"),
    pais: document.getElementById("pais"),
    tipo_producto: document.getElementById("tipo_producto"),
    volumen_mensual: document.getElementById("volumen_mensual"),
    comentarios: document.getElementById("comentarios"),
    privacidad: document.getElementById("privacidad")
  };

  function ensureErrorNode(input) {
    var errorId = input.id + "_error";
    var existing = document.getElementById(errorId);

    if (existing) {
      return existing;
    }

    var error = document.createElement("p");
    error.id = errorId;
    error.className = "mt-2 text-xs font-medium text-red-600";
    error.setAttribute("aria-live", "polite");
    input.insertAdjacentElement("afterend", error);
    return error;
  }

  function setFieldError(input, message) {
    var errorNode = ensureErrorNode(input);

    if (message) {
      errorNode.textContent = message;
      input.classList.add("border-red-500", "focus:border-red-500", "focus:ring-red-200");
      input.classList.remove("border-slate-300", "focus:border-teal-500", "focus:ring-teal-200");
      input.setAttribute("aria-invalid", "true");
      return false;
    }

    errorNode.textContent = "";
    input.classList.remove("border-red-500", "focus:border-red-500", "focus:ring-red-200");
    input.classList.add("border-slate-300", "focus:border-teal-500", "focus:ring-teal-200");
    input.removeAttribute("aria-invalid");
    return true;
  }

  function setGroupError(container, message) {
    if (!container) {
      return message === "";
    }

    container.textContent = message || "";
    return !message;
  }

  function validateTextMin(input, minChars, label) {
    var value = input.value.trim();

    if (value.length === 0) {
      return setFieldError(input, "Este campo es obligatorio.");
    }

    if (value.length < minChars) {
      return setFieldError(input, label + " debe tener al menos " + minChars + " caracteres.");
    }

    return setFieldError(input, "");
  }

  function validateEmail(input) {
    var value = input.value.trim();
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (value.length === 0) {
      return setFieldError(input, "El email es obligatorio.");
    }

    if (!emailRegex.test(value)) {
      return setFieldError(input, "Introduce un email valido.");
    }

    return setFieldError(input, "");
  }

  function validatePhone(input) {
    var value = input.value.trim();
    var hasPlusPrefix = /^\+/.test(value);
    var phoneCharsOk = /^\+[0-9\s().-]+$/.test(value);
    var digitCount = (value.match(/\d/g) || []).length;

    if (value.length === 0) {
      return setFieldError(input, "El telefono es obligatorio.");
    }

    if (!hasPlusPrefix) {
      return setFieldError(input, "El telefono debe empezar con el prefijo internacional (+).");
    }

    if (!phoneCharsOk || digitCount < 8) {
      return setFieldError(input, "Introduce un telefono valido (minimo 8 digitos).");
    }

    return setFieldError(input, "");
  }

  function validateWebsite(input) {
    var value = input.value.trim();

    if (value.length === 0) {
      return setFieldError(input, "El sitio web es obligatorio.");
    }

    try {
      var parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return setFieldError(input, "La URL debe iniciar con http:// o https://.");
      }
    } catch (error) {
      return setFieldError(input, "Introduce una URL valida.");
    }

    return setFieldError(input, "");
  }

  function validateSelect(input, label) {
    if (input.value === "") {
      return setFieldError(input, "Selecciona una opcion para " + label + ".");
    }

    return setFieldError(input, "");
  }

  function validateServicios() {
    var checked = form.querySelectorAll('input[name="servicios"]:checked').length > 0;

    if (!checked) {
      return setGroupError(serviciosError, "Selecciona al menos un servicio.");
    }

    return setGroupError(serviciosError, "");
  }

  function validatePlActual() {
    var checked = form.querySelector('input[name="pl_actual"]:checked');

    if (!checked) {
      return setGroupError(plActualError, "Indica si cuentas con un 3PL actual.");
    }

    return setGroupError(plActualError, "");
  }

  function validatePrivacidad(input) {
    if (!input.checked) {
      return setFieldError(input, "Debes aceptar la politica de privacidad.");
    }

    return setFieldError(input, "");
  }

  function validateComentarios(input) {
    var value = input.value.trim();

    if (value.length > 600) {
      return setFieldError(input, "Comentarios no puede superar 600 caracteres.");
    }

    return setFieldError(input, "");
  }

  function updateVolumenWarning() {
    if (!volumenWarning) {
      return;
    }

    if (fields.volumen_mensual.value === "0-100") {
      volumenWarning.textContent = "Para volúmenes menores a 100 envíos mensuales, nuestros servicios podrían no ser la solución más eficiente. ¿Seguro que quieres continuar?";
      volumenWarning.classList.remove("hidden");
      return;
    }

    volumenWarning.textContent = "";
    volumenWarning.classList.add("hidden");
  }

  function validateFieldById(fieldId) {
    switch (fieldId) {
      case "nombre_empresa":
        return validateTextMin(fields.nombre_empresa, 2, "Nombre empresa");
      case "persona_contacto":
        return validateTextMin(fields.persona_contacto, 2, "Persona contacto");
      case "email":
        return validateEmail(fields.email);
      case "telefono":
        return validatePhone(fields.telefono);
      case "sitio_web":
        return validateWebsite(fields.sitio_web);
      case "pais":
        return validateSelect(fields.pais, "Pais");
      case "tipo_producto":
        return validateSelect(fields.tipo_producto, "Tipo producto");
      case "volumen_mensual":
        updateVolumenWarning();
        return validateSelect(fields.volumen_mensual, "Volumen mensual");
      case "comentarios":
        return validateComentarios(fields.comentarios);
      case "privacidad":
        return validatePrivacidad(fields.privacidad);
      default:
        return true;
    }
  }

  function validateAll() {
    var allValid = true;

    Object.keys(fields).forEach(function (fieldId) {
      var valid = validateFieldById(fieldId);
      if (!valid) {
        allValid = false;
      }
    });

    if (!validateServicios()) {
      allValid = false;
    }

    if (!validatePlActual()) {
      allValid = false;
    }

    return allValid;
  }

  function hideSuccess() {
    successBox.textContent = "";
    successBox.classList.add("hidden");
  }

  Object.keys(fields).forEach(function (fieldId) {
    var element = fields[fieldId];
    var inputLike = element.tagName === "INPUT" || element.tagName === "TEXTAREA";

    if (inputLike) {
      element.addEventListener("input", function () {
        validateFieldById(fieldId);
        hideSuccess();
      });
    }

    element.addEventListener("blur", function () {
      validateFieldById(fieldId);
    });

    if (element.tagName === "SELECT" || element.type === "checkbox" || element.type === "radio") {
      element.addEventListener("change", function () {
        validateFieldById(fieldId);
        if (fieldId === "privacidad") {
          hideSuccess();
        }
      });
    }
  });

  form.querySelectorAll('input[name="servicios"]').forEach(function (checkbox) {
    checkbox.addEventListener("change", function () {
      validateServicios();
      hideSuccess();
    });
  });

  form.querySelectorAll('input[name="pl_actual"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      validatePlActual();
      hideSuccess();
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    hideSuccess();

    var valid = validateAll();
    if (!valid) {
      var firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid && typeof firstInvalid.focus === "function") {
        firstInvalid.focus();
      } else if (serviciosError && serviciosError.textContent) {
        var firstService = form.querySelector('input[name="servicios"]');
        if (firstService) {
          firstService.focus();
        }
      } else if (plActualError && plActualError.textContent) {
        var firstPlOption = form.querySelector('input[name="pl_actual"]');
        if (firstPlOption) {
          firstPlOption.focus();
        }
      }
      return;
    }

    successBox.textContent = "Formulario valido. Simulacion de envio completada correctamente.";
    successBox.classList.remove("hidden");
  });

  form.addEventListener("reset", function () {
    window.setTimeout(function () {
      Object.keys(fields).forEach(function (fieldId) {
        setFieldError(fields[fieldId], "");
      });
      setGroupError(serviciosError, "");
      setGroupError(plActualError, "");
      updateVolumenWarning();
      hideSuccess();
    }, 0);
  });
})();
