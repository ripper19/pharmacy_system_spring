const form = document.getElementById("loginform");
const messageEl = document.getElementById("loginMessage");

function showLoginMessage(message) {
    messageEl.textContent = message;
    messageEl.classList.add("show");
}

function clearLoginMessage() {
    messageEl.textContent = "";
    messageEl.classList.remove("show");
}

function setFieldError(input, message) {
    input.setAttribute("aria-invalid", "true");
    const field = input.closest(".field");
    let err = field.querySelector(".field-error");
    if (!err) {
        err = document.createElement("div");
        err.className = "field-error";
        err.setAttribute("role", "alert");
        field.appendChild(err);
    }
    err.textContent = message;
}

function clearFieldError(input) {
    input.removeAttribute("aria-invalid");
    const err = input.closest(".field").querySelector(".field-error");
    if (err) err.remove();
}

// Live inline validation
form.addEventListener("blur", (e) => {
    if (!e.target.matches("input")) return;
    if (!e.target.checkValidity()) setFieldError(e.target, e.target.validationMessage);
    else clearFieldError(e.target);
}, true);

form.addEventListener("input", (e) => {
    if (e.target.matches("input") && e.target.getAttribute("aria-invalid") === "true") {
        if (e.target.checkValidity()) clearFieldError(e.target);
    }
});

// Password visibility toggle
const EYE_ICON =
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_ICON =
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>' +
    '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>' +
    '<path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>' +
    '<line x1="2" x2="22" y1="2" y2="22"/></svg>';

const toggleBtn = document.getElementById("togglePassword");
toggleBtn.addEventListener("click", () => {
    const passwordInput = document.getElementById("password");
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    toggleBtn.innerHTML = show ? EYE_OFF_ICON : EYE_ICON;
    toggleBtn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    toggleBtn.setAttribute("aria-pressed", String(show));
    passwordInput.focus();
});

// Caps lock warning on the password field
(function () {
    const passwordInput = document.getElementById("password");
    if (!passwordInput) return;
    const hint = document.createElement("div");
    hint.className = "caps-hint";
    hint.setAttribute("role", "status");
    hint.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg> Caps Lock is on';
    passwordInput.closest(".password-wrap").after(hint);

    function checkCaps(e) {
        if (typeof e.getModifierState !== "function") return;
        hint.classList.toggle("show", e.getModifierState("CapsLock"));
    }
    passwordInput.addEventListener("keydown", checkCaps);
    passwordInput.addEventListener("keyup", checkCaps);
    passwordInput.addEventListener("blur", () => hint.classList.remove("show"));
})();

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearLoginMessage();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    let valid = true;
    [emailInput, passwordInput].forEach(input => {
        if (!input.checkValidity()) {
            setFieldError(input, input.validationMessage);
            if (valid) input.focus();
            valid = false;
        } else {
            clearFieldError(input);
        }
    });
    if (!valid) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = "Signing in…";

    try {
        const res = await fetch("https://pharmacy-system-spring-utt5.onrender.com/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({ email: emailInput.value, password: passwordInput.value })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Invalid credentials.");
        }

        const { name, email: bemail, role } = await res.json();
        localStorage.setItem('user', JSON.stringify({ name, bemail, role }));

        window.location.replace("dash.html");
    } catch (e) {
        if (e.message === "Failed to fetch" || e instanceof TypeError) {
            showLoginMessage("Network error — check your connection and try again.");
        } else {
            showLoginMessage(e.message || "Invalid credentials.");
        }
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
    }
});
