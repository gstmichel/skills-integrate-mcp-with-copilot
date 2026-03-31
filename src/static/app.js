document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userMenuBtn = document.getElementById("user-menu-btn");
  const userMenu = document.getElementById("user-menu");
  const loginActionBtn = document.getElementById("login-action-btn");
  const teacherStatus = document.getElementById("teacher-status");
  const loginModal = document.getElementById("login-modal");
  const closeLoginModal = document.getElementById("close-login-modal");
  const loginForm = document.getElementById("login-form");

  const AUTH_TOKEN_KEY = "teacherAuthToken";
  let authToken = localStorage.getItem(AUTH_TOKEN_KEY);
  let currentTeacher = null;

  function showMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function getAuthHeaders() {
    if (!authToken) return {};
    return { Authorization: `Bearer ${authToken}` };
  }

  function closeMenuAndModal() {
    userMenu.classList.add("hidden");
    loginModal.classList.add("hidden");
  }

  function updateAuthUI() {
    const isLoggedIn = Boolean(authToken && currentTeacher);

    if (isLoggedIn) {
      loginActionBtn.textContent = "Log Out";
      teacherStatus.textContent = `Logged in as ${currentTeacher}`;
      signupForm.querySelector("button[type='submit']").disabled = false;
    } else {
      loginActionBtn.textContent = "Teacher Login";
      teacherStatus.textContent = "Not logged in";
      signupForm.querySelector("button[type='submit']").disabled = true;
    }
  }

  async function verifySession() {
    if (!authToken) {
      currentTeacher = null;
      updateAuthUI();
      return;
    }

    try {
      const response = await fetch("/auth/me", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Session invalid");
      }

      const data = await response.json();
      currentTeacher = data.username;
    } catch (_error) {
      authToken = null;
      currentTeacher = null;
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }

    updateAuthUI();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      const isLoggedIn = Boolean(authToken && currentTeacher);

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isLoggedIn
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      if (!isLoggedIn) {
        showMessage("Teacher login is required to register or unregister students.", "info");
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";

        if (response.status === 401) {
          authToken = null;
          currentTeacher = null;
          localStorage.removeItem(AUTH_TOKEN_KEY);
          updateAuthUI();
        }
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authToken) {
      showMessage("Please log in as a teacher to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";

        if (response.status === 401) {
          authToken = null;
          currentTeacher = null;
          localStorage.removeItem(AUTH_TOKEN_KEY);
          updateAuthUI();
        }
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  userMenuBtn.addEventListener("click", () => {
    userMenu.classList.toggle("hidden");
  });

  loginActionBtn.addEventListener("click", async () => {
    if (authToken && currentTeacher) {
      try {
        await fetch("/auth/logout", {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
          },
        });
      } catch (_error) {
        // Clear local state even if backend logout fails.
      }

      authToken = null;
      currentTeacher = null;
      localStorage.removeItem(AUTH_TOKEN_KEY);
      updateAuthUI();
      closeMenuAndModal();
      fetchActivities();
      showMessage("Logged out.", "success");
      return;
    }

    loginModal.classList.remove("hidden");
  });

  closeLoginModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }

    if (!userMenu.contains(event.target) && event.target !== userMenuBtn) {
      userMenu.classList.add("hidden");
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        showMessage(data.detail || "Login failed", "error");
        return;
      }

      authToken = data.token;
      currentTeacher = data.username;
      localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      updateAuthUI();
      closeMenuAndModal();
      loginForm.reset();
      fetchActivities();
      showMessage(`Welcome, ${currentTeacher}!`, "success");
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
      console.error("Error during login:", error);
    }
  });

  // Initialize app
  verifySession().then(fetchActivities);
});
