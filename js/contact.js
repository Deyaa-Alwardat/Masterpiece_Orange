(function () {
  "use strict";

  var form = document.getElementById("contactForm");
  var status = document.getElementById("contactFormStatus");
  if (!form || !status) return;

  var nameField = document.getElementById("contactName");
  var messageField = document.getElementById("contactMessage");
  [nameField, messageField].forEach(function (field) {
    field.addEventListener("input", function () {
      field.setCustomValidity("");
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    nameField.setCustomValidity(
      nameField.value.trim().length < 2 ? "Enter your name." : "",
    );
    messageField.setCustomValidity(
      messageField.value.trim().length < 10
        ? "Please write at least 10 characters."
        : "",
    );
    if (!form.reportValidity()) return;

    var name = nameField.value.trim();
    var email = document.getElementById("contactEmail").value.trim();
    var topic = document.getElementById("contactTopic").value;
    var message = messageField.value.trim();
    var subject = "NEXUS contact: " + topic;
    var body = [
      "Name: " + name,
      "Email: " + email,
      "Topic: " + topic,
      "",
      message,
    ].join("\n");

    status.textContent =
      "Your email app should open with the message ready. If it doesn’t, email hello@nexus.jo.";
    window.location.href =
      "mailto:hello@nexus.jo?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body);
  });
})();
