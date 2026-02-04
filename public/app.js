const form = document.getElementById("survey-form");
const statusMessage = document.getElementById("form-status");

const otherTextInputs = Array.from(document.querySelectorAll(".survey__text"));

const syncOtherCheckbox = (textInput) => {
  const checkboxId = textInput.dataset.otherCheckbox;
  if (!checkboxId) {
    return;
  }
  const otherCheckbox = document.getElementById(checkboxId);
  if (!otherCheckbox) {
    return;
  }
  otherCheckbox.checked = textInput.value.trim().length > 0;
};

otherTextInputs.forEach((input) => {
  if (!input.dataset.otherCheckbox) {
    return;
  }
  syncOtherCheckbox(input);
  input.addEventListener("input", () => syncOtherCheckbox(input));
});

const normalizeFormData = (formData) => {
  const data = {};

  for (const [key, value] of formData.entries()) {
    if (!value) {
      continue;
    }

    if (data[key]) {
      if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    } else {
      data[key] = value;
    }
  }

  return data;
};

const setStatus = (message, type) => {
  statusMessage.textContent = message;
  statusMessage.classList.remove("survey__status--success", "survey__status--error");
  if (type === "success") {
    statusMessage.classList.add("survey__status--success");
  }
  if (type === "error") {
    statusMessage.classList.add("survey__status--error");
  }
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Submitting your response...", "");

  const formData = new FormData(form);
  const payload = normalizeFormData(formData);

  try {
    const response = await fetch("/api/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Failed to save response.");
    }

    form.reset();
    setStatus("Thank you! Your response has been saved.", "success");
  } catch (error) {
    setStatus("Sorry, something went wrong while saving your response.", "error");
  }
});
