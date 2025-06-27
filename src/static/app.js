document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  // Toolbar elements
  const categoryFilter = document.getElementById("category-filter");
  const sortFilter = document.getElementById("sort-filter");
  const searchFilter = document.getElementById("search-filter");

  let allActivities = {};
  let categories = new Set();

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      allActivities = activities;
      // Collect categories (if present)
      categories = new Set();
      Object.values(activities).forEach((details) => {
        if (details.category) categories.add(details.category);
      });
      renderCategoryOptions();
      renderActivities();
      renderActivityOptions();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function renderCategoryOptions() {
    if (!categoryFilter) return;
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });
  }

  function getFilteredSortedSearchedActivities() {
    let entries = Object.entries(allActivities);
    // Filter by category
    const selectedCategory = categoryFilter?.value || "";
    if (selectedCategory) {
      entries = entries.filter(
        ([, details]) => details.category === selectedCategory
      );
    }
    // Search
    const searchTerm = searchFilter?.value?.toLowerCase() || "";
    if (searchTerm) {
      entries = entries.filter(
        ([name, details]) =>
          name.toLowerCase().includes(searchTerm) ||
          (details.description &&
            details.description.toLowerCase().includes(searchTerm))
      );
    }
    // Sort
    const sortBy = sortFilter?.value || "name";
    if (sortBy === "name") {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    } else if (sortBy === "time") {
      entries.sort((a, b) => {
        // Try to extract time from schedule string
        const getTime = (details) => {
          const match = details.schedule?.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
          return match ? match[1] : "";
        };
        return getTime(a[1]).localeCompare(getTime(b[1]));
      });
    }
    return entries;
  }

  function renderActivities() {
    const entries = getFilteredSortedSearchedActivities();
    activitiesList.innerHTML = "";
    if (entries.length === 0) {
      activitiesList.innerHTML = "<p>No activities found.</p>";
      return;
    }
    entries.forEach(([name, details]) => {
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
                    `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                )
                .join("")}
            </ul>
          </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description || ""}</p>
        <p><strong>Schedule:</strong> ${details.schedule || ""}</p>
        <p><strong>Max Participants:</strong> ${details.max_participants || ""}</p>
        <p><strong>Category:</strong> ${details.category || "General"}</p>
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
  }

  function renderActivityOptions() {
    if (!activitySelect) return;
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    getFilteredSortedSearchedActivities().forEach(([name]) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      activitySelect.appendChild(opt);
    });
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

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
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

  // Toolbar event listeners
  if (categoryFilter)
    categoryFilter.addEventListener("change", () => {
      renderActivities();
      renderActivityOptions();
    });
  if (sortFilter)
    sortFilter.addEventListener("change", () => {
      renderActivities();
      renderActivityOptions();
    });
  if (searchFilter)
    searchFilter.addEventListener("input", () => {
      renderActivities();
      renderActivityOptions();
    });

  // Initialize app
  fetchActivities();
});
