/* NEXUS — member profile and security controls. */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "user",
    page: "user-profile",
    title: "Your profile",
    sub: "Manage your personal details and account security.",
  });
  if (!pg) return;

  const cities = ["Amman", "Irbid", "Aqaba", "Zarqa", "Madaba", "Salt", "Other"];
  const bytesLimit = 1.5 * 1024 * 1024;
  let user;
  try {
    user = await NX.Api.me();
  } catch (error) {
    pg.innerHTML = NX.errorBox(error.message);
    return;
  }

  const avatarMarkup = (profile) => profile.avatar
    ? `<img id="profileAvatar" src="${esc(profile.avatar)}" alt="${esc(profile.name)} profile photo">`
    : `<span id="profileInitials">${esc(NX.initials(profile.name))}</span>`;

  function render() {
    pg.innerHTML = `<div class="user-profile-layout">
      <section class="profile-identity card" aria-labelledby="profileNameHeading">
        <div class="profile-cover"><span class="cover-orb cover-orb-a"></span><span class="cover-orb cover-orb-b"></span><span class="cover-label">NEXUS MEMBER</span></div>
        <div class="identity-body">
          <div class="profile-photo-wrap">
            <div class="profile-photo" id="profilePhoto">${avatarMarkup(user)}</div>
            <label class="photo-edit" for="profilePhotoInput" aria-label="Add or change profile photo" title="Add or change photo">${NX.ic("edit")}</label>
            <input id="profilePhotoInput" class="sr" type="file" accept="image/png,image/jpeg,image/webp">
          </div>
          <span class="profile-eyebrow">Your NEXUS identity</span>
          <h2 id="profileNameHeading">${esc(user.name)}</h2>
          <p class="identity-email">${esc(user.email)}</p>
          <div class="identity-tags"><span class="profile-tag">${esc(user.city || "Set your city")}</span><span class="profile-tag profile-tag-soft">Member since ${esc(NX.dshort(user.created))}</span></div>
          <p class="identity-note">A complete profile helps keep your workspace bookings and expert sessions personal to you.</p>
          ${user.avatar ? '<button type="button" class="remove-photo" id="removePhoto">Remove profile photo</button>' : ""}
        </div>
      </section>

      <div class="profile-sections">
        <section class="card profile-section" aria-labelledby="personalHeading">
          <div class="profile-section-head"><span class="profile-section-icon">${NX.ic("user")}</span><div><h2 id="personalHeading">Personal details</h2><p>Keep your account information up to date.</p></div></div>
          <form id="detailsForm" class="profile-form" novalidate>
            <div class="field"><label for="pfName">Full name</label><input id="pfName" name="name" value="${esc(user.name)}" maxlength="60" autocomplete="name" required><small class="err field-error" id="pfNameError" role="alert"></small></div>
            <div class="field field-wide profile-email-field"><label for="pfEmail">Email address</label><input id="pfEmail" value="${esc(user.email)}" type="email" disabled><small class="field-hint">Email is linked to your sign-in and cannot be changed here.</small></div>
            <div class="field"><label for="pfPhone">Phone number</label><input id="pfPhone" name="phone" value="${esc(user.phone || "")}" autocomplete="tel" inputmode="tel" placeholder="+962 7X XXX XXXX"><small class="err field-error" id="pfPhoneError" role="alert"></small></div>
            <div class="field"><label for="pfCity">City</label><select id="pfCity" name="city">${cities.map((city) => `<option value="${city}"${city === user.city ? " selected" : ""}>${city}</option>`).join("")}</select></div>
            <div class="field field-wide"><label for="pfBio">A little about you <span class="optional-label">Optional</span></label><textarea id="pfBio" name="bio" rows="4" maxlength="300" placeholder="What do you work on? What helps you do your best work?">${esc(user.bio || "")}</textarea><div class="field-meta"><small class="field-hint">This helps us tailor your NEXUS experience.</small><small id="bioCount">0 / 300</small></div></div>
            <div class="profile-form-footer field-wide"><span class="save-state" id="profileSaveState" aria-live="polite"></span><button class="btn btn-primary" type="submit">Save changes ${NX.ic("arrow-r")}</button></div>
          </form>
        </section>

        <section class="card profile-section" aria-labelledby="securityHeading">
          <div class="profile-section-head"><span class="profile-section-icon security-icon">${NX.ic("lock")}</span><div><h2 id="securityHeading">Password & security</h2><p>Choose a strong password to protect your account.</p></div></div>
          <form id="passwordForm" class="profile-form password-form" novalidate>
            <div class="field field-wide"><label for="currentPassword">Current password</label><input id="currentPassword" type="password" autocomplete="current-password" required><small class="err field-error" id="currentPasswordError" role="alert"></small></div>
            <div class="field"><label for="newPassword">New password</label><input id="newPassword" type="password" autocomplete="new-password" minlength="8" placeholder="8+ characters" required><small class="err field-error" id="newPasswordError" role="alert"></small></div>
            <div class="field"><label for="confirmPassword">Confirm new password</label><input id="confirmPassword" type="password" autocomplete="new-password" required><small class="err field-error" id="confirmPasswordError" role="alert"></small></div>
            <div class="password-guidance field-wide"><span>${NX.ic("shield")}</span><p>Use at least 8 characters, including letters and numbers. Password updates apply to this demo session.</p></div>
            <div class="profile-form-footer field-wide"><span class="save-state" id="passwordSaveState" aria-live="polite"></span><button class="btn btn-ghost" type="submit">Update password</button></div>
          </form>
        </section>
        <p class="profile-demo-note">${NX.ic("alert")} Demo profile data is held in memory and resets when the page is refreshed.</p>
      </div>
    </div>`;
    bind();
  }

  function bind() {
    const bio = NX.$("#pfBio", pg);
    const bioCount = NX.$("#bioCount", pg);
    const updateBioCount = () => { bioCount.textContent = `${bio.value.length} / 300`; };
    bio.addEventListener("input", updateBioCount);
    updateBioCount();

    NX.$("#profilePhotoInput", pg).addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        NX.toast("Choose a JPG, PNG or WebP image.", true);
        event.target.value = "";
        return;
      }
      if (file.size > bytesLimit) {
        NX.toast("Choose an image smaller than 1.5 MB.", true);
        event.target.value = "";
        return;
      }
      await NX.run(event.target, async () => {
        const avatar = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("We could not read that image. Try another one."));
          reader.readAsDataURL(file);
        });
        user = await NX.Api.updateUserProfile({ avatar });
        render();
        NX.toast("Profile photo updated.");
      });
    });

    NX.$("#removePhoto", pg)?.addEventListener("click", async () => {
      await NX.run(NX.$("#removePhoto", pg), async () => {
        user = await NX.Api.updateUserProfile({ avatar: "" });
        render();
        NX.toast("Profile photo removed.");
      });
    });

    NX.$("#detailsForm", pg).addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = NX.$("#pfName", pg);
      const phone = NX.$("#pfPhone", pg);
      const validName = NX.fieldErr(name, name.value.trim().length < 2 ? "Enter your full name." : "");
      const validPhone = NX.fieldErr(phone, phone.value && !/^[+\d\s()-]{7,20}$/.test(phone.value) ? "Enter a valid phone number." : "");
      if (!validName || !validPhone) return;
      await NX.run(event.submitter, async () => {
        user = await NX.Api.updateUserProfile({
          name: name.value,
          phone: phone.value,
          city: NX.$("#pfCity", pg).value,
          bio: bio.value,
        });
        render();
        NX.toast("Your profile has been saved.");
      });
    });

    NX.$("#passwordForm", pg).addEventListener("submit", async (event) => {
      event.preventDefault();
      const current = NX.$("#currentPassword", pg);
      const next = NX.$("#newPassword", pg);
      const confirm = NX.$("#confirmPassword", pg);
      const validCurrent = NX.fieldErr(current, current.value ? "" : "Enter your current password.");
      const validNext = NX.fieldErr(next, next.value.length >= 8 && /[A-Za-z]/.test(next.value) && /\d/.test(next.value) ? "" : "Use at least 8 characters with letters and numbers.");
      const validConfirm = NX.fieldErr(confirm, confirm.value === next.value ? "" : "Passwords do not match.");
      if (!validCurrent || !validNext || !validConfirm) return;
      await NX.run(event.submitter, async () => {
        try {
          await NX.Api.changeUserPassword(current.value, next.value);
          event.target.reset();
          NX.toast("Your password has been updated.");
        } catch (error) {
          NX.fieldErr(current, error.message);
        }
      });
    });
  }

  render();
});
